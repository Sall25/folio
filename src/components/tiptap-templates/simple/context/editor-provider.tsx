import { useEffect, useRef, useCallback, type ReactNode } from "react";
import {
  Editor,
  useEditor,
  type Extensions,
  type JSONContent,
} from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { useEditorExtensions } from "../hooks/use-editor-extensions";
import { EditorContext } from "@tiptap/react";
import { EditorRefsContext } from "./editor-refs-context";
import type { EditorExtensionRefs } from "./editor-extension-refs";
import { useWhyDidYouRender } from "src/lib/useWhyDidYouRender";
import { useActivePage } from "./active-page-context";
import type { Transaction } from "@tiptap/pm/state";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import { useDebouncedCallback } from "use-debounce";
import { stripPropertyPanels } from "../hooks/use-record-property-panel";
import { useDataSources } from "src/hooks/use-data-sources";
import type { DataSource, ID } from "src/types";

interface StructuredPageGuardStorage {
  isStructuredActivePage: () => boolean;
}

declare module "@tiptap/core" {
  interface Storage {
    structuredPageGuard: StructuredPageGuardStorage;
  }
}

// ── Structured (database) page guard ──────────────────────────────────────
// A database page is a page that a data source points at (source.pageId).
// Its document is fixed-shape — title + record property node + database node —
// and the user must not be able to add free content (paragraphs, headings,
// pasted blocks, dropped images, etc.). filterTransaction is the single
// chokepoint every structural change flows through (Enter, paste, drop, input
// rules, slash commands), so guarding here is leak-proof.
//
// Rather than hardcode the allowed node TYPE NAMES (which would break loading
// if a name is wrong), we capture the top-level node sequence the page loads
// with and reject any transaction that would change it. Editing the title
// (text only) leaves the sequence identical → allowed. Inserting/splitting a
// block changes it → rejected.

// Node types injected into the live doc AFTER load and stripped on save
// (record-property panels via stripPropertyPanels). Excluded from the
// structural comparison so panel injection isn't mistaken for content insert.
const TRANSIENT_TOP_LEVEL = new Set<string>(["recordPropertyPanel"]);

// The structural fingerprint of a doc: ordered top-level node type names,
// excluding transient ones.
function structuralTypes(doc: ProseMirrorNode): string[] {
  const types: string[] = [];
  doc.forEach((n) => {
    if (!TRANSIENT_TOP_LEVEL.has(n.type.name)) types.push(n.type.name);
  });
  return types;
}

function sameStructure(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function getTitleChange(
  editor: Editor,
  transaction: Transaction,
): {
  changed: boolean;
  text: string | null;
} {
  if (!transaction.docChanged) return { changed: false, text: null };

  const { $from } = editor.state.selection;

  const node = $from.node();
  if (node.type.name === "title") {
    return {
      changed: true,
      text: node.textContent,
    };
  }
  return {
    changed: false,
    text: null,
  };
}

const EDITOR_ATTRIBUTES = {
  autocomplete: "off",
  autocorrect: "off",
  autocapitalize: "off",
  spellcheck: "false",
  "aria-label": "Main content area, start typing to enter text.",
  class: "simple-editor",
};

export function EditorProvider({ children }: { children: ReactNode }) {
  const { activePageId, activePage, isLoading } = useActivePage();
  const activePageRef = useRef(activePage);
  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage, isLoading, activePageId]);

  const refsRef = useRef<EditorExtensionRefs>({
    setTocContent: () => {},
    setActivePageId: () => {},
  });

  const { extensions } = useEditorExtensions(refsRef);

  // Set of page ids that ARE databases (page is referenced by a data source).
  // Kept in a ref so the guard reads it synchronously without re-subscribing.
  const { data: dataSources } = useDataSources();
  const dbPageIdsRef = useRef<Set<ID>>(new Set());
  useEffect(() => {
    dbPageIdsRef.current = new Set(
      ((dataSources as DataSource[]) ?? []).map((s) => s.pageId),
    );
  }, [dataSources]);

  // The frozen structural fingerprint for the current page (null = not a
  // database page, or load not yet captured → guard stays passive).
  const frozenStructureRef = useRef<string[] | null>(null);

  // Is the CURRENT active page a database page? Shared via guard storage so
  // other extensions (e.g. the trailing-paragraph plugin) can opt out of
  // mutating the doc on structured pages.
  const isStructuredActivePage = () => {
    const page = activePageRef.current;
    return !!page && dbPageIdsRef.current.has(page.id);
  };
  const isStructuredRef = useRef(isStructuredActivePage);
  isStructuredRef.current = isStructuredActivePage;

  // Created once. Closes over the stable refs so it always reads the CURRENT
  // active page + db set, even though the editor instance is shared across
  // every page and only swaps content on navigation.
  const guardExtensionRef = useRef<Extension | null>(null);
  if (!guardExtensionRef.current) {
    guardExtensionRef.current = Extension.create<
      unknown,
      StructuredPageGuardStorage
    >({
      name: "structuredPageGuard",
      addStorage() {
        return {
          // Read by ParagraphNode's trailing-paragraph plugin.
          isStructuredActivePage: () => isStructuredRef.current(),
        };
      },
      addProseMirrorPlugins() {
        return [
          new Plugin({
            filterTransaction: (tr: Transaction) => {
              if (!tr.docChanged) return true; // selection-only → allow
              const page = activePageRef.current;
              if (!page || !dbPageIdsRef.current.has(page.id)) return true; // normal page
              const frozen = frozenStructureRef.current;
              if (!frozen) return true; // pre-capture (load in flight) → never block
              return sameStructure(structuralTypes(tr.doc), frozen);
            },
          }),
        ];
      },
    });
  }

  const editor = useEditor({
    editorProps: { attributes: EDITOR_ATTRIBUTES },
    extensions: [...extensions, guardExtensionRef.current] as Extensions,
    shouldRerenderOnTransaction: false,
    content: "<p>No content</p>",
  });

  // Strip any trailing empty paragraph(s) on a database page, then capture the
  // structural baseline. Used by BOTH the navigation load and the retroactive
  // capture (race: dataSources resolved AFTER navigation, so the load happened
  // while the page wasn't yet known to be a database and the trailing-paragraph
  // plugin appended one). frozen is reset to null up front so the strip's
  // deletes pass the guard; the plugin skips db pages, so they aren't re-added.
  const captureBaseline = useCallback(() => {
    if (!editor) return;
    frozenStructureRef.current = null;
    const page = activePageRef.current;
    if (!page || !dbPageIdsRef.current.has(page.id)) return; // normal page → stay passive

    let guardCount = 0;
    let last = editor.state.doc.lastChild;
    while (
      last &&
      last.type.name === "paragraph" &&
      last.content.size === 0 &&
      guardCount++ < 50
    ) {
      const size = editor.state.doc.content.size;
      editor.commands.deleteRange({ from: size - last.nodeSize, to: size });
      last = editor.state.doc.lastChild;
    }
    frozenStructureRef.current = structuralTypes(editor.state.doc);
  }, [editor]);

  // If data sources arrive AFTER navigating to a database page, run the
  // baseline capture retroactively — this also strips the trailing paragraph
  // the plugin appended during the unguarded load.
  useEffect(() => {
    if (!editor) return;
    const page = activePageRef.current;
    if (
      page &&
      dbPageIdsRef.current.has(page.id) &&
      frozenStructureRef.current == null
    ) {
      captureBaseline();
    }
  }, [editor, dataSources, captureBaseline]);

  // ── Autosave ──────────────────────────────────────────────────────────
  const latestTitleRef = useRef<string | null>(null);
  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));

  const saveActivePage = useDebouncedCallback(
    () => {
      const page = activePageRef.current;
      if (!page || !editor) return;
      const titleOverride = latestTitleRef.current;
      latestTitleRef.current = null;
      mutateAsync({
        id: page.id,
        patch: {
          title: titleOverride ?? page.title,
          content: stripPropertyPanels(editor.getJSON()) as JSONContent,
          updatedAt: Date.now(),
        },
      });
      console.log("saved");
    },
    800,
    { maxWait: 2500 },
  );

  useEffect(() => {
    if (!editor) return;

    const update = ({
      editor,
      transaction,
    }: {
      editor: Editor;
      transaction: Transaction;
    }) => {
      if (!activePageRef.current) return;

      const { changed, text } = getTitleChange(editor, transaction);
      if (changed) latestTitleRef.current = text;

      saveActivePage();
    };

    editor.on("update", update);

    return () => {
      editor.off("update", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, activePage]);

  useEffect(() => {
    if (!editor) return;
    saveActivePage.flush();
    frozenStructureRef.current = null;

    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      const page = activePageRef.current;
      if (!page || page.id !== activePageId) return;

      let content = page.content;
      const isDb = dbPageIdsRef.current.has(page.id);
      const nodes = content?.content ?? [];
      const dbIndex = nodes.findIndex((n) => n.type === "database");

      if (isDb && dbIndex >= 0 && dbIndex < nodes.length - 1) {
        content = { ...content, content: nodes.slice(0, dbIndex + 1) };
      }

      editor.commands.setContent(content, { emitUpdate: false });
      captureBaseline();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, activePageId, isLoading]);
  useWhyDidYouRender("editor-provider", {
    extensions,
    editor,
    refsRef,
  });

  return (
    <EditorRefsContext.Provider value={refsRef}>
      <EditorContext.Provider value={{ editor }}>
        {children}
      </EditorContext.Provider>
    </EditorRefsContext.Provider>
  );
}
