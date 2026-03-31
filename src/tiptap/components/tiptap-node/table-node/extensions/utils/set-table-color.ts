import type { Transaction } from "@tiptap/pm/state";

export function setTableColor(tr: Transaction, pos: number, color: string, target: 'text' | 'highlight') {
  const node = tr.doc.nodeAt(pos)
  if (!node) return tr

  const from = pos

  const attrs = {
    ...node.attrs,
    ...(target === 'text'
      ? { color }
      : { background: color })
  }
  return tr.setNodeMarkup(from, undefined, attrs)
}