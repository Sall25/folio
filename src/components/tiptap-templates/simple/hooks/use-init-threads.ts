// use-init-threads.ts
import { useEffect } from "react";
import { commentThreadPluginKey } from "src/components/tiptap-ui/comments/extensions/comment-thread-extension";
import type { Editor } from "@tiptap/react";
import { useSimpleEditor } from "../context/simple-editor-context";

type UseInitThreadsProps = {
  editor: Editor | null;
};

export function useInitThreads({ editor }: UseInitThreadsProps) {
  const { isLoading, threads, activePage } = useSimpleEditor();
  useEffect(() => {
    if (!editor || isLoading || !threads || !activePage?.id) return;

    const timer = setTimeout(() => {
      editor.view.dispatch(
        editor.state.tr.setMeta(commentThreadPluginKey, {
          type: "initialThreads",
          providedThreads: threads,
        }),
      );
    }, 0);

    return () => clearTimeout(timer);
  }, [editor, isLoading, threads, activePage?.id]);
}
