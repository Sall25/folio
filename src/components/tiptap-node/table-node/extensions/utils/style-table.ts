import type { Transaction } from "@tiptap/pm/state";

export function styleTable(tr: Transaction, pos: number, styles: Partial<CSSStyleDeclaration>) {
  const tableNode = tr.doc.nodeAt(pos)
  if (!tableNode) return tr

  tableNode.descendants((node, offset) => {
    if (node.type.name === 'tableCell') {
      const cellPos = pos + offset
      tr = tr.setNodeMarkup(
        cellPos,
        undefined,
        {
          ...node.attrs,
          ...styles
        }
      )
    }
  })
  return tr
}