import type { Editor } from "@tiptap/core";
import { commentThreadPluginKey } from "../comment-thread-extension";

export function addComment(editor: Editor, threadId: string, commentAuthorId: string, commentText: string) {
  // thread.comments.push({
  //   id: crypto.randomUUID(),
  //   threadId,
  //   authorId: commentAuthorId,
  //   text: commentText,
  //   createdAt: Date.now()
  // })

  editor.view.dispatch(
    editor.state.tr.setMeta(commentThreadPluginKey, { type: 'addComment', threadId, authorId: commentAuthorId, text: commentText })
  )

}