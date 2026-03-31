import { Transaction } from '@tiptap/pm/state'
import { Editor } from '@tiptap/react'

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Checks whether a ProseMirror transaction contains any marks
 * that can be removed (optionally skipping specified mark types).
 */
export function canResetMarks(
  tr: Transaction,
  skip: string[] = []
): boolean {
  let hasMarks = false
  tr.doc.nodesBetween(tr.selection.from, tr.selection.to, (node) => {
    if (hasMarks) return false
    hasMarks = node.marks.some(
      (mark) => !skip.includes(mark.type.name)
    )
  })
  return hasMarks
}

/**
 * Removes all marks from a transaction, except those in the skip list.
 * Returns the modified transaction.
 */
export function removeAllMarksExcept(
  tr: Transaction,
  skip: string[] = []
): Transaction {
  const { from, to } = tr.selection
  tr.doc.nodesBetween(from, to, (node, pos) => {
    node.marks.forEach((mark) => {
      if (!skip.includes(mark.type.name)) {
        tr.removeMark(pos, pos + node.nodeSize, mark.type)
      }
    })
  })
  return tr
}

/**
 * Checks if formatting can be reset in the current editor state.
 */
export function canResetFormatting(
  editor: Editor | null,
  preserveMarks: string[] = []
): boolean {
  if (!editor) return false
  const tr = editor.state.tr
  return canResetMarks(tr, preserveMarks)
}

/**
 * Programmatically resets all formatting marks in the current selection.
 * Returns true if the operation was dispatched successfully.
 */
export function resetFormatting(
  editor: Editor | null,
  preserveMarks: string[] = []
): boolean {
  if (!editor) return false
  const tr = removeAllMarksExcept(editor.state.tr, preserveMarks)
  editor.view.dispatch(tr)
  editor.commands.focus()
  return true
}
