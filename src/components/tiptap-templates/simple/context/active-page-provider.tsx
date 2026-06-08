import { useEffect, useRef, type ReactNode } from "react";
import { ActivePageContext } from "./active-page-context";
import { useCurrentEditor } from "@tiptap/react";
import type { Editor, JSONContent } from "@tiptap/react";
import type { Transaction } from "@tiptap/pm/state";
import { useDebouncedCallback } from "use-debounce";
import { useActivePage } from "../use-active-page";
import type { Page } from "../types";
import { useWhyDidYouRender } from "src/lib/useWhyDidYouRender";
import { usePages } from "../use-pages";
import { stripPropertyPanels } from "../hooks/use-record-property-panel";

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

function findPage(pages: Page[], id: number): Page | undefined {
  for (const page of pages) {
    if (page.id === id) return page;
    if (page.children?.length) {
      const found = findPage(page.children, id);
      if (found) return found;
    }
  }
}

export function ActivePageProvider({ children }: { children: ReactNode }) {
  const { addPageAsync, updatePageAsync } = usePages();
  const {
    activePageId,
    setActivePageId,
    activePage,
    debounceUpdatePage,
    debounceUpdatePageFast,
    isLoading,
    pages,
    ...props
  } = useActivePage();
  const activePageRef = useRef(activePage);
  const { editor } = useCurrentEditor();

  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage, isLoading]);

  // ── Autosave ──────────────────────────────────────────────────────────
  // The expensive part (editor.getJSON() + stripPropertyPanels, which walk the
  // whole doc) runs ONLY when this debounce flushes — never per keystroke.
  // The editor.on("update") handler below just captures the latest title text
  // (cheap) and reschedules this saver, so typing stays instant.
  const latestTitleRef = useRef<string | null>(null);

  const saveActivePage = useDebouncedCallback(
    () => {
      const page = activePageRef.current;
      if (!page || !editor) return;
      const titleOverride = latestTitleRef.current;
      latestTitleRef.current = null;
      updatePageAsync({
        ...page,
        title: titleOverride ?? page.title,
        content: stripPropertyPanels(editor.getJSON()) as JSONContent,
        // preserve record link fields — not part of editor content
        databaseId: page.databaseId,
        recordId: page.recordId,
        updatedAt: Date.now().toString(),
      });
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
      if (changed) latestTitleRef.current = text; // cheap: just remember it

      // Cheap: reschedules the debounce. Serialization happens on flush.
      saveActivePage();
    };

    editor.on("update", update);

    return () => {
      editor.off("update", update);
    };
  }, [editor, saveActivePage]);

  useEffect(() => {
    if (!editor) return;
    if (activePageId === undefined) return;
    queueMicrotask(() => {
      editor.commands.syncSlashCommandCtx({
        activePageId,
        setActivePageId,
        addPageAsync,
      });
    });
  }, [activePageId, setActivePageId, addPageAsync, editor]);

  useEffect(() => {
    if (!editor) return;
    if (!pages) return;

    // Commit any pending edit for the OUTGOING page before swapping content,
    // so a trailing autosave can't land after the switch.
    saveActivePage.flush();

    requestAnimationFrame(() => {
      queueMicrotask(() => {
        const newPage =
          activePageId === undefined
            ? null
            : (findPage(pages, activePageId) ?? null);

        if (!newPage) return;

        const content = newPage.content;
        const id = newPage.id;

        if (activePageId !== id) return;
        editor.commands.setContent(content, { emitUpdate: false });
      });
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePageId, isLoading]);

  useEffect(() => {
    if (!editor || !pages) return;
    editor.storage.pageLink.pages = pages;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, pages?.length]);

  useWhyDidYouRender("active-page-provider", { editor });

  return (
    <ActivePageContext.Provider
      value={{
        ...props,
        activePage,
        activePageId,
        debounceUpdatePage,
        debounceUpdatePageFast,
        pages,
        isLoading,
        setActivePageId,
      }}
    >
      {children}
    </ActivePageContext.Provider>
  );
}
