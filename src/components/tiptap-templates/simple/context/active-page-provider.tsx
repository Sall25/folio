import { useEffect, useRef, type ReactNode } from "react";
import { ActivePageContext } from "./active-page-context";
import { useCurrentEditor } from "@tiptap/react";
import { useVersions } from "src/components/tiptap-ui/version-history/use-versions";
import type { Editor } from "@tiptap/react";
import type { Transaction } from "@tiptap/pm/state";
import { useActivePage } from "../use-active-page";
import type { Page } from "../types";

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
const VERSION_INTERVAL = 10 * 60 * 1000; // 10mins
let lastVersionTime = Date.now();

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
  const {
    activePageId,
    activePage,
    debounceUpdatePage,
    debounceUpdatePageFast,
    isLoading,
    pages,
    ...props
  } = useActivePage();
  const { createVersionAsync } = useVersions(activePageId);
  const activePageRef = useRef(activePage);
  const debounceUpdatePageRef = useRef(debounceUpdatePage);
  const debounceUpdatePageFastRef = useRef(debounceUpdatePageFast);
  const createVersionAsyncRef = useRef(createVersionAsync);

  const { editor } = useCurrentEditor();

  useEffect(() => {
    createVersionAsyncRef.current = createVersionAsync;
  }, [createVersionAsync]);

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
          title: text ?? activePageRef.current.title, // sync title property
          content: editor.getJSON(),
        });
      } else {
        debounceUpdatePageRef.current({
          ...activePageRef.current,
          content: editor.getJSON(),
        });
      }

      const now = Date.now();
      if (now - lastVersionTime >= VERSION_INTERVAL) {
        createVersionAsyncRef.current({
          pageId: activePageRef.current.id,
          title: activePageRef.current.title,
          content: activePageRef.current.content,
          isNamed: false,
        });
        lastVersionTime = now;
      }
    };

    editor.on("update", update);

    return () => {
      editor.off("update", update);
    };
  }, [
    editor,
    debounceUpdatePage,
    createVersionAsync,
    debounceUpdatePageFast,
    activePage,
  ]);

  useEffect(() => {
    if (!editor) return;
    if (!pages) return;

    // Find the new page synchronously right now, not via ref
    const newPage =
      activePageId === undefined
        ? null
        : (findPage(pages, activePageId) ?? null);

    if (!newPage) return;

    // Capture content now, not in a microtask
    const content = newPage.content;

    // Still need to defer past the current render so the editor
    // is done with any in-flight transactions
    requestAnimationFrame(() => {
      //  Guard: if user navigated again while frame was pending, bail
      if (activePageId !== newPage.id) return;

      editor.commands.setContent(content, { emitUpdate: false });
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePageId]);

  useEffect(() => {
    if (!editor || !pages) return;
    editor.storage.pageLink.pages = pages;
  }, [editor, pages]);

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
      }}
    >
      {children}
    </ActivePageContext.Provider>
  );
}
