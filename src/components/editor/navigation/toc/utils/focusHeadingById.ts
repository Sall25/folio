import { TextSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/core'

export function focusHeadingById(editor: Editor, id: string) {
  const { state, view } = editor
  const { doc } = state

  let targetPos: number | null = null

  doc.descendants((node, pos) => {
    if (node.type.name === 'heading' && node.attrs.id === id) {
      // +1 puts cursor inside the heading text
      targetPos = pos + 1
      return false
    }
    return true
  })

  if (targetPos === null) return

  const tr = state.tr
    .setSelection(TextSelection.create(state.doc, targetPos))
    .scrollIntoView()

  view.dispatch(tr)
  editor.commands.focus()
}
