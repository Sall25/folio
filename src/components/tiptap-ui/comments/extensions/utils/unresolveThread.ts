import type { Editor } from "@tiptap/core"
import { commentThreadPluginKey } from "../comment-thread-extension"

// Mark a thread as open/unresolved
export function unresolveThread(editor: Editor, threadId: string) {

  editor.view.dispatch(
    editor.state.tr.setMeta(commentThreadPluginKey, { type: 'unresolveThread', threadId })
  )
}