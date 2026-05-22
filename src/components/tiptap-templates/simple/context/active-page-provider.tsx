import { useEffect, useRef, type ReactNode } from "react";
import { ActivePageContext } from "./active-page-context";
import { useCurrentEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import type { Transaction } from "@tiptap/pm/state";
import { useActivePage } from "../use-active-page";
import type { Page } from "../types";
import { useWhyDidYouRender } from "src/lib/useWhyDidYouRender";
import { usePages } from "../use-pages";

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
  const { addPageAsync } = usePages();
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
  const debounceUpdatePageRef = useRef(debounceUpdatePage);
  const debounceUpdatePageFastRef = useRef(debounceUpdatePageFast);
  const { editor } = useCurrentEditor();

  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage, isLoading]);

  useEffect(() => {
    debounceUpdatePageRef.current = debounceUpdatePage;
    debounceUpdatePageFastRef.current = debounceUpdatePageFast;
  }, [debounceUpdatePage, debounceUpdatePageFast]);

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

      if (changed) {
        debounceUpdatePageFastRef.current({
          ...activePageRef.current,
          title: text ?? activePageRef.current.title,
          content: editor.getJSON(),
          // preserve record link fields — not part of editor content
          databaseId: activePageRef.current.databaseId,
          recordId: activePageRef.current.recordId,
          updatedAt: Date.now().toString(),
        });
      } else {
        debounceUpdatePageRef.current({
          ...activePageRef.current,
          content: editor.getJSON(),
          databaseId: activePageRef.current.databaseId,
          recordId: activePageRef.current.recordId,
          updatedAt: Date.now().toString(),
        });
      }
    };

    editor.on("update", update);

    return () => {
      editor.off("update", update);
    };
  }, [editor, debounceUpdatePage, debounceUpdatePageFast, activePage]);

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
