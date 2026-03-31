import type { Editor } from "@tiptap/core";
import { useEffect, useState } from "react";
import type { PositionedThread } from "../types";

export function usePositionedThreads(editor: Editor | null) {
  const [positionedThreads, setPositionedThreads] = useState<PositionedThread[]>([])

  useEffect(() => {
    if (!editor) return

    const update = () => {
      const commentThreadExtension = editor.storage.commentThreadExtension

      setPositionedThreads(commentThreadExtension.positionedThreads)
    }

    editor.on('transaction', update)

    return () => {
      editor.off('transaction', update)
    }
  }, [editor])

  return { positionedThreads }

}