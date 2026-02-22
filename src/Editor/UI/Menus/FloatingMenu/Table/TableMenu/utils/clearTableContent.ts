import { Slice } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";

export function clearTableContent(tr: Transaction, pos: number) {
  const tableNode = tr.doc.nodeAt(pos)
  if (!tableNode) return tr


  tableNode.descendants((node, offset) => {
    if (node.type.name === 'tableCell') {
      const cellPos = pos + offset
      tr = tr.replace(
        cellPos + 1,
        cellPos + 1 + node.content.size,
        Slice.empty
      )
    }
  })
  return tr
}