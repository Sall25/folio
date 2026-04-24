import { useToc } from "src/components/tiptap-node/toc-node/use-toc";
import type { Page } from "../types";
import { Editor, useEditor } from "@tiptap/react";
import { useEffect, useRef } from "react";
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

export function useEditorSetup(): { editor: Editor | null } {
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
    updatePageSilentAsync,
    createVersionAsync,
  } = useSimpleEditor();

  const activePageRef = useRef<Page | null>(null);
  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastVersionTime = useRef<number>(Date.now());
  const VERSION_INTERVAL = 10 * 60 * 1000; // 10 minutes

  console.log("use-editor-setup re-render");

  useEffect(() => {
    activePageRef.current = activePage;
    lastVersionTime.current = 0; // ← reset so first edit on new page creates a version after interval
    if (titleSaveTimer.current) {
      clearTimeout(titleSaveTimer.current);
      titleSaveTimer.current = null;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage?.id]);

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: { attributes: EDITOR_ATTRIBUTES },
    extensions: extensions,
    onUpdate({ editor }) {
      if (isSwitchingPage.current || !activePageRef.current) return;

      const newTitle = editor.state.doc.firstChild?.textContent;
      const updatedPage = {
        ...activePageRef.current,
        title: newTitle ?? "New Page",
        content: editor.getJSON(),
      };
      pendingUpdate.current = updatedPage;

      if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);

      // Only debounce-save when title changes — content is handled elsewhere
      if (newTitle !== activePageRef.current?.title) {
        titleSaveTimer.current = setTimeout(() => {
          updatePageSilentAsync(updatedPage);

          const now = Date.now();
          if (now - lastVersionTime.current >= VERSION_INTERVAL) {
            lastVersionTime.current = now;
            createVersionAsync({
              pageId: updatedPage.id,
              title: updatedPage.title,
              content: updatedPage.content,
              isNamed: false,
            });
            console.log("version created");
          }
        }, 500);
      }

      activePageRef.current = updatedPage;
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

  return { editor };
}
