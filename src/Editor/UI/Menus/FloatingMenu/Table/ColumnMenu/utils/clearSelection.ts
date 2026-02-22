import { TextSelection, type Transaction } from "@tiptap/pm/state";
import { CellSelection } from "prosemirror-tables";

export function clearSelection(tr: Transaction) {
  const { selection } = tr
  if (selection instanceof CellSelection) {
    const pos = selection.$anchorCell.pos + 1
    return tr.setSelection(TextSelection.create(tr.doc, pos))
  }
  return tr
}