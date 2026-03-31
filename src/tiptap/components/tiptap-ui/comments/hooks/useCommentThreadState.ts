import type { Editor } from "@tiptap/core";
import { useEffect, useState } from "react";
import { getCommentThreadState } from "../extensions/utils/getCommentThreadState";
import type { CommentThreadState } from "../extensions/comment-thread-extension";

export function useCommentThreadState(editor: Editor | null) {
  const [threadState, setThreadState] = useState<CommentThreadState | null>(null)

  useEffect(() => {
    if (!editor) return

    const update = () => {
      const state = getCommentThreadState(editor) as CommentThreadState
      setThreadState(state)
    }

    editor.on('transaction', update)

    return () => {
      editor.off('transaction', update)
    }
  }, [editor])

  return threadState
}