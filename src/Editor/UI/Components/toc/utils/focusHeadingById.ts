import { type Editor } from '@tiptap/core'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'

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

  const node = doc.nodeAt(targetPos)
  if (!node) return

  const tr = state.tr
    .setSelection(TextSelection.create(state.doc, targetPos))
    //.setSelection(NodeSelection.create(doc, targetPos))
    .scrollIntoView()
    .setMeta('decorateSelection', { from: targetPos, to: targetPos + node.nodeSize })




  view.dispatch(tr)

  requestAnimationFrame(() => {
    view.focus()

  })
  //editor.commands.setNodeSelection(targetPos)
  // editor.commands.focus()
}
