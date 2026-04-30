import type { Editor } from "@tiptap/core";
import { useEffect, useState } from "react";
import type { PositionedThread } from "../types";
import { commentThreadPluginKey } from "../extensions/comment-thread-extension";

export function usePositionedThreads(editor: Editor | null) {
  const [positionedThreads, setPositionedThreads] = useState<
    PositionedThread[]
  >([]);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const positionedThreads =
        commentThreadPluginKey.getState(editor.state)?.positionedThreads ?? [];
      setPositionedThreads(positionedThreads);
    };

    editor.on("transaction", update);

    return () => {
      editor.off("transaction", update);
    };
  }, [editor]);

  return { positionedThreads };
}
