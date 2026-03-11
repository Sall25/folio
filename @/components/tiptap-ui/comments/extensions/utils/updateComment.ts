import type { Editor } from "@tiptap/core";
import { commentThreadPluginKey } from "../comment-thread-extension";

export function updateComment(editor: Editor, threadId: string, commentId: string, newText: string) {
  // const { threads } = getCommentThreadState(editor)

  // const thread = threads.find(thread => thread.id === threadId)
  // if (!thread) return

  // const newComments = thread.comments.map(comment => (
  //   comment.id === commentId ? { ...comment, text: newText } : comment
  // ))

  // thread.comments = newComments

  editor.view.dispatch(
    editor.state.tr.setMeta(commentThreadPluginKey, { type: 'updateComment', threadId, commentId, newText })
  )


}