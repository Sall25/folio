import type { Transaction } from "@tiptap/pm/state";
import { CellSelection } from "prosemirror-tables";

export function selectCell(tr: Transaction, pos: number) {
  const $cell = tr.doc.resolve(pos);

  return tr.setSelection(new CellSelection($cell));
}
