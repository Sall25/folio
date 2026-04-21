import { useToc } from "src/components/tiptap-node/toc-node/use-toc";
import type { Page, SimpleEditorContentProps } from "../types";
import { useEditor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { useEditorExtensions } from "./use-editor-extensions";
import { useInitThreads } from "./use-init-threads";
import { usePages } from "../use-pages";
import { useActivePageId } from "../context/active-page-context";

type UseEditorSetupProps = Pick<
  SimpleEditorContentProps,
  "activePage" | "updatePageAsync" | "addPageAsync" | "pages"
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
  pages,
}: UseEditorSetupProps) {
  const { setTocContent } = useToc();
  const { extensions, threads, isLoading } = useEditorExtensions(setTocContent);
  const isSwitchingPage = useRef(false);
  const pendingUpdate = useRef<Page | null>(null);
  const { addPageAsync } = usePages();
  const { setActivePageId } = useActivePageId();

  const activePageRef = useRef<Page | null>(null);

  useEffect(() => {
    activePageRef.current = activePage;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage]);

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: { attributes: EDITOR_ATTRIBUTES },
    extensions: extensions,
    onUpdate({ editor }) {
      if (isSwitchingPage.current || !activePageRef.current) return;

      const newTitle = editor.state.doc.firstChild?.textContent;
      // just store locally, don't save yet
      pendingUpdate.current = {
        ...activePageRef.current,
        title: newTitle ?? "New Page",
        content: editor.getJSON(),
      };

      // title saves immediately
      if (newTitle !== activePageRef.current.title) {
        updatePageAsync({
          ...activePageRef.current,
          title: newTitle ?? "New Page",
        });
      }
    },
    onDestroy() {
      if (pendingUpdate.current) {
        updatePageAsync(pendingUpdate.current);
        pendingUpdate.current = null;
      }
    },
    content: activePage.content,
  });

  useEffect(() => {
    if (!editor) return;
    if (!activePage.id) return;
    if (!activePageRef.current) return;

    editor.storage.slashCommand.activePage = activePageRef.current;
    editor.storage.slashCommand.addPageAsync = addPageAsync;
    editor.storage.slashCommand.setActivePageId = setActivePageId;
    editor.storage.pageLink.pages = pages;

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
      // const doc = Node.fromJSON(editor.schema, activePageRef.current!.content);
      // const state = EditorState.create({
      //   doc,
      //   schema: editor.schema,
      //   plugins: editor.state.plugins,
      // });

      // setTimeout(() => {
      //   // ← push outside React's render cycle
      //   editor.view.updateState(state);

      //   try {
      //     const restoredSelection = TextSelection.create(
      //       state.doc,
      //       state.selection.from,
      //       state.selection.to,
      //     );
      //     editor.view.dispatch(editor.state.tr.setSelection(restoredSelection));
      //   } catch {
      //     // position out of bounds
      //   }

      //   isSwitchingPage.current = false;
      // }, 0);

      // editor.view.updateState(state);

      // try {
      //   const restoredSelection = TextSelection.create(state.doc, from, to);
      //   editor.view.dispatch(editor.state.tr.setSelection(restoredSelection));
      // } catch {
      //   /** */
      // }

      // isSwitchingPage.current = false;
    });

    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage.id, editor, addPageAsync, updatePageAsync, setActivePageId]);

  useInitThreads({ editor, threads, isLoading, pageId: activePage.id });

  return { editor };
}
