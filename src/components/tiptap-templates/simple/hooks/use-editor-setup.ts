import { useToc } from "src/components/tiptap-node/toc-node/use-toc";
import type { SimpleEditorContentProps } from "../types";
import { useEditor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { useEditorExtensions } from "./use-editor-extensions";
import { useInitThreads } from "./use-init-threads";
import { Node } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";

type UseEditorSetupProps = Pick<
  SimpleEditorContentProps,
  "activePage" | "updatePageAsync"
>;

const EDITOR_ATTRIBUTES = {
  autocomplete: "off",
  autocorrect: "off",
  autocapitalize: "off",
  spellcheck: "false",
  "aria-label": "Main content area, start typing to enter text.",
  class: "simple-editor",
};

export function useEditorSetup({
  activePage,
  updatePageAsync,
}: UseEditorSetupProps) {
  const { setTocContent } = useToc();
  const { extensions, threads, isLoading } = useEditorExtensions(setTocContent);
  const docCache = useRef<Map<string, Node>>(new Map());

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: { attributes: EDITOR_ATTRIBUTES },
    extensions: extensions,
    onUpdate({ editor }) {
      const newTitle = editor.state.doc.firstChild?.textContent;
      updatePageAsync({
        ...activePage,
        title: newTitle ?? "New Page",
        content: editor.getJSON(),
      });
    },
    content: activePage.content,
  });

  useEffect(() => {
    if (!editor) return;
    if (!activePage?.id) return;

    const raf = requestAnimationFrame(() => {
      let doc = docCache.current.get(activePage.id);

      if (!doc) {
        doc = Node.fromJSON(editor.schema, activePage.content);
        docCache.current.set(activePage.id, doc);
      }

      const { from, to } = editor.state.selection;

      const state = EditorState.create({
        doc,
        schema: editor.schema,
        plugins: editor.state.plugins,
      });

      editor.view.updateState(state);

      try {
        const restoredSelection = TextSelection.create(state.doc, from, to);
        editor.view.dispatch(editor.state.tr.setSelection(restoredSelection));
      } catch {
        // position out of bounds
      }
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage.id, editor]);

  useInitThreads({ editor, threads, isLoading, pageId: activePage.id });

  return { editor };
}
