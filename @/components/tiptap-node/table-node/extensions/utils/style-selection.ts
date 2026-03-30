import type { Transaction } from "@tiptap/pm/state";
import { CellSelection } from "prosemirror-tables";

export function styleSelection(
  tr: Transaction,
  styles: Partial<CSSStyleDeclaration>,
) {
  const { selection } = tr;
  if (selection instanceof CellSelection) {
    selection.forEachCell((cell, pos) => {
      tr = tr.setNodeMarkup(pos, null, {
        ...cell.attrs,
        ...styles,
      });
    });
  }
  return tr;
}
