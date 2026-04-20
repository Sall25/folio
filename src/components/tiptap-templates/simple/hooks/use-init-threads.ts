// use-init-threads.ts
import { useEffect } from "react";
import { commentThreadPluginKey } from "src/components/tiptap-ui/comments/extensions/comment-thread-extension";
import type { Thread } from "src/components/tiptap-ui/comments/types";
import type { Editor } from "@tiptap/react";

type UseInitThreadsProps = {
  editor: Editor | null;
  threads: Thread[] | undefined;
  isLoading: boolean;
  pageId: string;
};

export function useInitThreads({
  editor,
  threads,
  isLoading,
  pageId,
}: UseInitThreadsProps) {
  useEffect(() => {
    if (!editor || isLoading || !threads) return;

    const timer = setTimeout(() => {
      editor.view.dispatch(
        editor.state.tr.setMeta(commentThreadPluginKey, {
          type: "initialThreads",
          providedThreads: threads,
        }),
      );
    }, 0);

    return () => clearTimeout(timer);
  }, [editor, isLoading, threads, pageId]);
}
