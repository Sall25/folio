import type { Editor } from "@tiptap/core";
import { commentThreadPluginKey } from "../comment-thread-extension";

export function removeComment(editor: Editor, threadId: string, commentId: string) {
  editor.view.dispatch(
    editor.state.tr.setMeta(commentThreadPluginKey, { type: 'removeComment', threadId, commentId })
  )
}