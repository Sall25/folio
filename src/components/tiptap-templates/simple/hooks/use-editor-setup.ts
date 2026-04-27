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
  const { setActivePageId, activePageId } = useActivePageId();
  const {
    activePage,
    addPageAsync,
    pages,
    createVersionAsync,
    onVersionHistoryOpenChanged,
    debounceUpdatePage,
    setActivePage,
  } = useSimpleEditor();

  const activePageRef = useRef<Page | null>(activePage);
  const originalContentRef = useRef<Page["content"] | undefined>(
    activePage?.content,
  );
  const isPreviewingVersion = useRef(false);
  const lastVersionTime = useRef<number>(Date.now());
  const VERSION_INTERVAL = 10 * 60 * 1000; // 10 minutes

  useEffect(() => {
    if (!activePage) return;
    activePageRef.current = activePage;
    originalContentRef.current = activePage?.content;
    onVersionHistoryOpenChanged(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePageId]);

  useEffect(() => {
    if (!activePage) return;
    activePageRef.current = activePage;
  }, [activePage]);

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: { attributes: EDITOR_ATTRIBUTES },
    extensions: extensions,
    onUpdate({ editor }) {
      if (
        isPreviewingVersion.current ||
        !activePageRef.current ||
        isSwitchingPage.current ||
        editor.storage.slashCommand.isSwitching
      )
        return;
      const newTitle = editor.state.doc.firstChild?.textContent;
      const updatedPage = {
        ...activePageRef.current,
        title: newTitle ?? "New Page",
        content: editor.getJSON(),
      };
      activePageRef.current = updatedPage;
      setActivePage(activePageRef.current);

      console.log("onUpdate");

      debounceUpdatePage(updatedPage);

      const now = Date.now();
      if (now - lastVersionTime.current >= VERSION_INTERVAL) {
        lastVersionTime.current = now;
        createVersionAsync({
          pageId: updatedPage.id,
          title: updatedPage.title,
          content: updatedPage.content,
          isNamed: false,
        });
      }
    },
    onDestroy() {
      debounceUpdatePage.flush();
    },
    content: activePageRef.current ? activePageRef.current.content : "<p></p>",
  });

  useEffect(() => {
    if (!editor) return;
    if (!activePageRef.current) return;
    if (activePageId === undefined) return;
    if (editor.storage.slashCommand.isSwitching) return;

    console.log("useEffect activePageId", activePageId);

    editor.storage.slashCommand.activePageId = activePageId;
    editor.storage.slashCommand.addPageAsync = addPageAsync;
    editor.storage.slashCommand.setActivePageId = setActivePageId;
    editor.storage.pageLink.pages = pages ?? [];

    isSwitchingPage.current = true;
    const raf = requestAnimationFrame(() => {
      if (activePageRef.current) {
        editor.commands.setContent(activePageRef.current.content);
      }

      isSwitchingPage.current = false;
    });

    return () => cancelAnimationFrame(raf);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePageId]);

  useInitThreads({ editor });

  const startVersionPreview = useCallback(() => {
    isPreviewingVersion.current = true;
  }, []);

  const endVersionPreview = useCallback(() => {
    isPreviewingVersion.current = false;
  }, []);

  return { editor, startVersionPreview, endVersionPreview, originalContentRef };
}
