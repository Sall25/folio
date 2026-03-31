
import type { Editor } from "@tiptap/core"
import { commentThreadPluginKey } from "../comment-thread-extension"

// Delete a thread by id
export function removeThread(editor: Editor, threadId: string) {
  editor.view.dispatch(
    editor.state.tr.setMeta(commentThreadPluginKey, { type: 'removeThread', threadId })
  )
}
