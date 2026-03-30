import { minMax } from "@tiptap/core";
import { NodeSelection, type Transaction } from "@tiptap/pm/state";

export function selectTable(tr: Transaction, pos: number) {
  const from = minMax(pos, 0, tr.doc.content.size)
  const selection = NodeSelection.create(tr.doc, from)

  return tr.setSelection(selection)
}