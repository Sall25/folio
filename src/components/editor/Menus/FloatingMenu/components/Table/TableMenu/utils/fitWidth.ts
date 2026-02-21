import type { Transaction } from "@tiptap/pm/state";

export function fitWidth(tr: Transaction, pos: number) {
  const tableNode = tr.doc.nodeAt(pos)
  if (!tableNode) return tr

  const colCount = tableNode.firstChild?.childCount ?? 0
  if (!colCount) return tr

  const widthPercent = Math.floor(100 / colCount)

  tableNode.descendants((node, offset) => {
    if (node.type.name === 'tableColumn') {
      const colPos = pos + offset
      tr = tr.setNodeMarkup(colPos, undefined, {
        ...node.attrs,
        width: `${widthPercent}%`
      })
    }
  })
  return tr
}