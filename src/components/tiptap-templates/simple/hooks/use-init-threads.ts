// use-init-threads.ts
import { useEffect } from "react";
import { commentThreadPluginKey } from "src/components/tiptap-ui/comments/extensions/comment-thread-extension";
import { useCurrentEditor } from "@tiptap/react";
import { useThreadContext } from "../context/thread-context";

export function useInitThreads() {
  const { threads } = useThreadContext();
  const { editor } = useCurrentEditor();
  useEffect(() => {
    if (!editor || !threads) return;

    const timer = setTimeout(() => {
      editor.view.dispatch(
        editor.state.tr.setMeta(commentThreadPluginKey, {
          type: "initialThreads",
          providedThreads: threads,
        }),
      );
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
