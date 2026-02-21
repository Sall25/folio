import { Slice } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import { CellSelection } from "prosemirror-tables";

export function clearSelectionContent(tr: Transaction) {
  const { selection } = tr

  if (!(selection instanceof CellSelection)) {
    return tr
  }

  return tr.replaceSelection(Slice.empty)
}