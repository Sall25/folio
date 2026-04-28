import { useToc } from "src/components/tiptap-node/toc-node/use-toc";
import { Editor, useEditor, type JSONContent } from "@tiptap/react";
import { useEditorExtensions } from "./use-editor-extensions";
import { useActivePage } from "../use-active-page";
import { useEffect, useRef } from "react";
import { useActivePageId } from "../context/active-page-context";
import type { Transaction } from "@tiptap/pm/state";
import { useVersions } from "src/components/tiptap-ui/version-history/use-versions";

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

export interface EditorSetupProps {
  content: JSONContent | string;
}

export function useEditorSetup({ content }: EditorSetupProps) {
  const { setTocContent } = useToc();
  const { extensions } = useEditorExtensions(setTocContent);
  const { debounceUpdatePage, activePage, debounceUpdatePageFast } =
    useActivePage();

  const { activePageId } = useActivePageId();
  const { createVersionAsync } = useVersions(activePageId);
  const lastVersionTime = useRef(Date.now());
  const VERSION_INTERVAL = 10 * 60 * 1000; // 10mins

  // Flush on page switch or unmount — no delay
  useEffect(() => {
    return () => {
      debounceUpdatePage.flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePageId]);

  // Keep activePage fresh inside the onUpdate closure
  const activePageRef = useRef(activePage);
  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  const editor = useEditor({
    editorProps: { attributes: EDITOR_ATTRIBUTES },
    extensions,
    shouldRerenderOnTransaction: false,
    content: content ?? "<p></p>",
    onUpdate({ editor, transaction }) {
      if (!activePageRef.current) return;

      const { changed, text } = getTitleChange(editor, transaction);

      if (changed) {
        debounceUpdatePageFast({
          ...activePageRef.current,
          title: text ?? activePageRef.current.title, // sync title property
          content: editor.getJSON(),
        });
      } else {
        debounceUpdatePage({
          ...activePageRef.current,
          content: editor.getJSON(),
        });
      }

      const now = Date.now();
      if (now - lastVersionTime.current >= VERSION_INTERVAL) {
        createVersionAsync({
          pageId: activePageRef.current.id,
          title: activePageRef.current.title,
          content: activePageRef.current.content,
          isNamed: false,
        });
        lastVersionTime.current = now;
      }
    },
  });

  //  Sync server content into editor once it arrives
  const hasSetContent = useRef(false);
  useEffect(() => {
    if (!editor || !content || hasSetContent.current) return;
    // Only set if editor currently has empty/default content
    queueMicrotask(() =>
      editor.commands.setContent(content, { emitUpdate: false }),
    );
    hasSetContent.current = true;
  }, [editor, content]);

  // Reset flag when page changes so new page content loads fresh
  useEffect(() => {
    hasSetContent.current = false;
  }, [content]); // content memo key is activePageId, so this fires on page switch

  return { editor };
}
