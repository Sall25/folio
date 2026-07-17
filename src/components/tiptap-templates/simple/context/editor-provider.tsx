import { useEffect, useRef, useMemo, type ReactNode } from "react";
import { Editor, useEditor, type Extensions } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import type { Doc as YDoc } from "yjs";
import type { HocuspocusProvider } from "@hocuspocus/provider";
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
import { useDataSources } from "src/hooks/use-data-sources";
import type { DataSource, Page } from "src/types";
import { useCollabDoc } from "../hooks/use-collab-doc";
import { useCurrentPerson } from "src/hooks/use-session";
import { EditorSyncContext } from "./editor-sync-context"; // adjust path
import { useCreatePage } from "src/hooks/use-create-page";
import { makePage } from "src/utils/make-page";

// Exactly the array type useEditorExtensions produces — derived so it can't
// drift from the real return, whatever member types are in it (one of them
// is typed `() => Element | null`, which the stock `Extensions` type
// rejects; this doesn't).
type EditorExtensions = ReturnType<typeof useEditorExtensions>["extensions"];

interface StructuredPageGuardStorage {
  isStructuredActivePage: () => boolean;
}

declare module "@tiptap/core" {
  interface Storage {
    structuredPageGuard: StructuredPageGuardStorage;
  }
}

// ── Structured (database) page guard ──────────────────────────────────────
// Unchanged from before — this operates on ProseMirror transactions, which
// exist identically whether the doc is backed by Yjs or not.
const TRANSIENT_TOP_LEVEL = new Set<string>(["recordPropertyPanel"]);

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
): { changed: boolean; text: string | null } {
  if (!transaction.docChanged) return { changed: false, text: null };
  const { $from } = editor.state.selection;
  const node = $from.node();
  if (node.type.name === "title") {
    return { changed: true, text: node.textContent };
  }
  return { changed: false, text: null };
}

const EDITOR_ATTRIBUTES = {
  autocomplete: "off",
  autocorrect: "off",
  autocapitalize: "off",
  spellcheck: "false",
  "aria-label": "Main content area, start typing to enter text.",
  class: "simple-editor",
};

// Small deterministic name->color mapping for collaboration carets. Swap for
// something nicer (a fixed per-person color stored on the Person record)
// whenever that becomes worth doing — this is just "not literally random".
const CARET_COLORS = [
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#a3e635",
  "#34d399",
  "#22d3ee",
  "#818cf8",
  "#e879f9",
];
function colorForPersonId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return CARET_COLORS[Math.abs(hash) % CARET_COLORS.length];
}

// ── Inner instance — one per page, remounted via `key` on page change ─────
// Owns the actual useEditor() call. Recreated from scratch whenever the
// page (and therefore the Y.Doc) changes, since Collaboration binds to one
// specific Y.Doc for the lifetime of the editor instance — there's no
// supported way to hot-swap it on a live editor.

interface EditorInstanceProps {
  page: Page;
  isDbPage: boolean;
  ydoc: YDoc;
  provider: HocuspocusProvider;
  baseExtensions: EditorExtensions;
  refsRef: React.RefObject<EditorExtensionRefs>;
  children: ReactNode;
}

function EditorInstance({
  page,
  isDbPage,
  ydoc,
  provider,
  baseExtensions,
  refsRef,
  children,
}: EditorInstanceProps) {
  const { person } = useCurrentPerson();

  const frozenStructureRef = useRef<string[] | null>(null);
  const isStructuredRef = useRef(isDbPage);
  isStructuredRef.current = isDbPage;

  const guardExtensionRef = useRef<Extension | null>(null);
  if (!guardExtensionRef.current) {
    guardExtensionRef.current = Extension.create<
      unknown,
      StructuredPageGuardStorage
    >({
      name: "structuredPageGuard",
      addStorage() {
        return {
          isStructuredActivePage: () => isStructuredRef.current,
        };
      },
      addProseMirrorPlugins() {
        return [
          new Plugin({
            filterTransaction: (tr: Transaction) => {
              if (!tr.docChanged) return true;
              if (!isStructuredRef.current) return true;
              const frozen = frozenStructureRef.current;
              if (!frozen) return true;
              return sameStructure(structuralTypes(tr.doc), frozen);
            },
          }),
        ];
      },
    });
  }

  const editor = useEditor({
    editorProps: { attributes: EDITOR_ATTRIBUTES },
    extensions: [
      ...baseExtensions,
      guardExtensionRef.current,
      // Collaboration/CollaborationCaret bundle their own @tiptap/core copy,
      // which is nominally distinct from the app's even when structurally
      // identical — cast each to the app's extension type at the boundary.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Collaboration.configure({ document: ydoc }) as any,
      CollaborationCaret.configure({
        provider,
        user: {
          name: person?.name ?? "Anonymous",
          color: person ? colorForPersonId(person.id) : "#999999",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    ] as Extensions,
    shouldRerenderOnTransaction: false,
    // No `content` — Collaboration reads initial content from the Y.Doc,
    // which useCollabDoc has already seeded (or is genuinely empty/new).
  });

  const { mutateAsync: createPage } = useCreatePage();

  useEffect(() => {
    if (!editor) return;
    editor.commands.syncSlashCommandCtx({
      activePageId: page.id,
      setActivePageId: (id) => refsRef.current?.setActivePageId(id),
      addPageAsync: ({ title, parentId }) => {
        const newPage = makePage({ title, parentId });
        return createPage(newPage);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, page.id, createPage]);

  // Baseline capture for db-page structure guard — same trailing-paragraph
  // strip as before, just running once against the live (already-synced)
  // editor doc instead of against freshly-set JSON.
  useEffect(() => {
    if (!editor || !isDbPage) return;
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
    // Known gap: the old code also trimmed any nodes *after* the database
    // node out of raw JSON before setContent, for db pages. That trimming
    // assumed a JSON-load path that no longer exists (content now comes
    // from the Yjs doc). Needs a fresh look for db pages specifically —
    // not solved here, flagging rather than guessing at the right fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // ── Autosave — title only. Content persistence is now Yjs/Hocuspocus's
  // job entirely; patching editor.getJSON() back to json-server would be
  // fighting the same data two systems both think they own.
  const latestTitleRef = useRef<string | null>(null);
  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));

  const saveTitle = useDebouncedCallback(
    () => {
      const title = latestTitleRef.current;
      if (title == null) return;
      latestTitleRef.current = null;
      mutateAsync({ id: page.id, patch: { title, updatedAt: Date.now() } });
    },
    1500,
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
      const { changed, text } = getTitleChange(editor, transaction);
      if (changed) {
        latestTitleRef.current = text;
        saveTitle();
      }
    };
    editor.on("update", update);
    return () => {
      editor.off("update", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <EditorContext.Provider value={{ editor }}>
      {children}
    </EditorContext.Provider>
  );
}

// ── Outer provider — stable across page navigation, owns refs/context,
// delegates the actual editor lifecycle to EditorInstance below.

export function EditorProvider({ children }: { children: ReactNode }) {
  const { /*activePageId,*/ activePage, isLoading } = useActivePage();

  const refsRef = useRef<EditorExtensionRefs>({
    setTocContent: () => {},
    setActivePageId: () => {},
  });

  const { extensions } = useEditorExtensions(refsRef);

  const { data: dataSources } = useDataSources();
  const dbPageIds = useMemo(
    () => new Set(((dataSources as DataSource[]) ?? []).map((s) => s.pageId)),
    [dataSources],
  );

  const { ydoc, provider, isSynced } = useCollabDoc(activePage ?? null);

  useWhyDidYouRender("editor-provider", { extensions, refsRef });

  const isDbPage = !!activePage && dbPageIds.has(activePage.id);

  const ready = activePage && !isLoading && provider && isSynced;

  // Syncing = we have a page to show, but its collab doc isn't ready yet.
  // (No active page at all isn't "syncing" — that's an empty/home state.)
  const isSyncing = !!activePage && !ready;

  return (
    <EditorSyncContext.Provider value={{ isSyncing }}>
      <EditorRefsContext.Provider value={refsRef}>
        {ready ? (
          <EditorInstance
            key={activePage.id}
            page={activePage}
            isDbPage={isDbPage}
            ydoc={ydoc}
            provider={provider}
            baseExtensions={extensions}
            refsRef={refsRef}
          >
            {children}
          </EditorInstance>
        ) : (
          // Before a page is synced, provide a null editor so UI that reads
          // useCurrentEditor() renders its empty/loading state instead of
          // crashing. Same context shape, editor just isn't there yet.
          <EditorContext.Provider value={{ editor: null }}>
            {children}
          </EditorContext.Provider>
        )}
      </EditorRefsContext.Provider>
    </EditorSyncContext.Provider>
  );
}
