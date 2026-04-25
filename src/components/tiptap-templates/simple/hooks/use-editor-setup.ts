import { useToc } from "src/components/tiptap-node/toc-node/use-toc";
import type { Page } from "../types";
import { useEditor } from "@tiptap/react";
import { useCallback, useEffect, useRef } from "react";
import { useEditorExtensions } from "./use-editor-extensions";
import { useInitThreads } from "./use-init-threads";
import { useActivePageId } from "../context/active-page-context";
import { useSimpleEditor } from "../context/simple-editor-context";

const EDITOR_ATTRIBUTES = {
  autocomplete: "off",
  autocorrect: "off",
  autocapitalize: "off",
  spellcheck: "false",
  "aria-label": "Main content area, start typing to enter text.",
  class: "simple-editor",
};

export function useEditorSetup() {
  const { setTocContent } = useToc();
  const { extensions } = useEditorExtensions(setTocContent);
  const isSwitchingPage = useRef(false);
  const pendingUpdate = useRef<Page | null>(null);
  const { setActivePageId, activePageId } = useActivePageId();
  const {
    activePage,
    updatePageAsync,
    addPageAsync,
    pages,
    createVersionAsync,
    onVersionHistoryOpenChanged,
  } = useSimpleEditor();

  const activePageRef = useRef<Page | null>(activePage);
  const originalContentRef = useRef<Page["content"] | undefined>(
    activePage?.content,
  );
  const isPreviewingVersion = useRef(false);
  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastVersionTime = useRef<number>(Date.now());
  const VERSION_INTERVAL = 10 * 60 * 1000; // 10 minutes
  const versionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!activePage) return;
    activePageRef.current = activePage;
    lastVersionTime.current = 0; // ← reset so first edit on new page creates a version after interval
    if (titleSaveTimer.current) {
      clearTimeout(titleSaveTimer.current);
      titleSaveTimer.current = null;
    }
    if (versionTimer.current) {
      clearTimeout(versionTimer.current);
      versionTimer.current = null;
    }
    originalContentRef.current = activePage?.content;
    onVersionHistoryOpenChanged(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage?.id]);

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: { attributes: EDITOR_ATTRIBUTES },
    extensions: extensions,
    onUpdate({ editor }) {
      if (
        isSwitchingPage.current ||
        isPreviewingVersion.current ||
        !activePageRef.current
      )
        return;

      const newTitle = editor.state.doc.firstChild?.textContent;
      const updatedPage = {
        ...activePageRef.current,
        title: newTitle ?? "New Page",
        content: editor.getJSON(),
      };
      pendingUpdate.current = updatedPage;
      activePageRef.current = updatedPage;

      if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
      titleSaveTimer.current = setTimeout(() => {
        updatePageAsync(updatedPage);
      }, 500);

      // const { $from } = editor.state.selection;

      // // Title save — only when title changes
      // if ($from.node().type.name === "title" || versionHistoryOpen) {
      //   if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
      //   titleSaveTimer.current = setTimeout(() => {
      //     updatePageSilentAsync(updatedPage);
      //   }, 500);
      // }

      // Version creation — independent, fires on any edit after interval
      if (versionTimer.current) clearTimeout(versionTimer.current);
      versionTimer.current = setTimeout(() => {
        const now = Date.now();
        if (now - lastVersionTime.current >= VERSION_INTERVAL) {
          lastVersionTime.current = now;
          createVersionAsync({
            pageId: updatedPage.id,
            title: updatedPage.title,
            content: updatedPage.content,
            isNamed: false,
          });
          if (pendingUpdate.current) {
            updatePageAsync(pendingUpdate.current);
          }
        }
      }, 500);
    },
    onDestroy() {
      if (pendingUpdate.current) {
        updatePageAsync(pendingUpdate.current);
        pendingUpdate.current = null;
      }
    },
    content: activePageRef.current ? activePageRef.current.content : "<p></p>",
  });

  useEffect(() => {
    if (isPreviewingVersion.current) return;
    if (!editor) return;
    if (!activePage) return;
    if (!activePageRef.current) return;

    editor.storage.slashCommand.activePage = activePageRef.current;
    editor.storage.slashCommand.addPageAsync = addPageAsync;
    editor.storage.slashCommand.setActivePageId = setActivePageId;
    editor.storage.pageLink.pages = pages ?? [];

    if (pendingUpdate.current) {
      updatePageAsync(pendingUpdate.current);
      pendingUpdate.current = null;
    }

    isSwitchingPage.current = true;
    const raf = requestAnimationFrame(() => {
      if (pendingUpdate.current) {
        updatePageAsync(pendingUpdate.current);
        pendingUpdate.current = null;
      }
      if (activePageRef.current) {
        editor.commands.setContent(activePageRef.current.content);
      }

      isSwitchingPage.current = false;
    });

    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activePage?.id,
    editor,
    addPageAsync,
    updatePageAsync,
    setActivePageId,
    activePageId,
  ]);

  useInitThreads({ editor });

  const startVersionPreview = useCallback(() => {
    isPreviewingVersion.current = true;
  }, []);

  const endVersionPreview = useCallback(() => {
    isPreviewingVersion.current = false;
  }, []);

  return { editor, startVersionPreview, endVersionPreview, originalContentRef };
}
