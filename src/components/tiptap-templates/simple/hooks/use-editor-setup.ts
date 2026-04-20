import { useToc } from "src/components/tiptap-node/toc-node/use-toc";
import type { SimpleEditorContentProps } from "../types";
import { useEditorSave } from "./use-editor-save";
import { useEditor } from "@tiptap/react";
import { useCallback, useEffect, useRef } from "react";
import { useEditorExtensions } from "./use-editor-extensions";
import { useInitThreads } from "./use-init-threads";
import { Node } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";

type UseEditorSetupProps = Pick<
  SimpleEditorContentProps,
  "activePage" | "updatePage"
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
  updatePage,
}: UseEditorSetupProps) {
  const { setTocContent } = useToc();
  const { extensions, threads, isLoading } = useEditorExtensions(setTocContent);
  const docCache = useRef<Map<string, Node>>(new Map());
  const onDeleteCache = useCallback(
    () => docCache.current.delete(activePage.id),
    [activePage],
  );
  const {
    save,
    setSaveState,
    onDirtyChanged,
    onIsReadyChanged,
    isReady,
    savingTimerRef,
    saveState,
  } = useEditorSave({ updatePage, activePage, onDeleteCache });

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: { attributes: EDITOR_ATTRIBUTES },
    extensions: extensions,
    onUpdate({ editor }) {
      if (!isReady.current) return;
      onDirtyChanged(true);
      setSaveState("unsaved");

      const { $from } = editor.state.selection; // `this` = editor inside onUpdate
      const isInTitle =
        $from.node().type.name === "title" ||
        $from.node(1)?.type.name === "title";
      if (!isInTitle) return;

      const newTitle = editor.state.doc.firstChild?.textContent;
      if (newTitle !== activePage.title) {
        updatePage({ ...activePage, title: newTitle ?? "New Page" });
        if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
        savingTimerRef.current = setTimeout(() => save(editor), 1000);
      }
    },
    content: activePage.content,
  });

  useEffect(() => {
    if (!editor) return;
    onIsReadyChanged(false);
    onDirtyChanged(false);
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

      isReady.current = true;
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage.id, editor, onDirtyChanged, onIsReadyChanged]);

  // Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        save(editor!);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor, save]);

  useInitThreads({ editor, threads, isLoading, pageId: activePage.id });

  return { editor, saveState };
}
