import type { Editor } from "@tiptap/core"
import { commentThreadPluginKey } from "../comment-thread-extension"

// Mark a thread as drafted
export function draftThread(editor: Editor) {

  const { from, to } = editor.state.tr.selection

  const threadId = crypto.randomUUID()
  // threads.push({
  //   id: threadId,
  //   content: '',
  //   anchor: { from, to },
  //   status: 'drafted',
  //   comments: []
  // })

  editor.view.dispatch(
    editor.state.tr.setMeta(commentThreadPluginKey, { type: 'draftThread', from, to, threadId })
  )

  

  console.log('threadId', threadId)
}