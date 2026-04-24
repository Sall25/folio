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
  const { setActivePageId } = useActivePageId();
  const {
    activePage,
    updatePageAsync,
    addPageAsync,
    pages,
    updatePageSilentAsync,
  } = useSimpleEditor();

  const activePageRef = useRef<Page | null>(null);
  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  console.log("use-editor-setup re-render");

  useEffect(() => {
    activePageRef.current = activePage;
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

      if (newTitle !== activePageRef.current.title) {
        activePageRef.current = updatedPage;
        // Debounce title save — only persist after user stops typing for 500ms
        if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
        titleSaveTimer.current = setTimeout(() => {
          updatePageSilentAsync(updatedPage);
        }, 500);
      }
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
  }, [activePage?.id, editor, addPageAsync, updatePageAsync, setActivePageId]);

  useInitThreads({ editor });

  return { editor };
}
