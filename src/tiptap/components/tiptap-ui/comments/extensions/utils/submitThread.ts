
import type { Editor } from "@tiptap/core";
import { commentThreadPluginKey } from "../comment-thread-extension";

// Mark a thread as submitted
export function submitThread(editor: Editor, content: string) {
  const { draftId } = editor.storage.commentThreadExtension

  if (!draftId) return

  // const thread = threads.find(thread => thread.id === draftId)
  // if (!thread) return

  // thread.comments.push({
  //   threadId: draftId,
  //   id: crypto.randomUUID(),
  //   authorId: 'You',
  //   text: content,
  //   createdAt: Date.now()
  // })

  // thread.status = 'open'
  // draftId = null

  // editor.view.dispatch(
  //   editor.state.tr.setMeta('force-measure', true)
  // )

  editor.view.dispatch(
    editor.state.tr.setMeta(commentThreadPluginKey, { type: 'submitThread', content, threadId: draftId })
  )
}