import type { Transaction } from "@tiptap/pm/state";
import { Decoration } from "@tiptap/pm/view";
import { CellSelection } from "prosemirror-tables";
//import { alignCellPluginKey } from "../../extensions/plugins/alignPlugin";

export function alignSelection(tr: Transaction, align: 'left' | 'right' | 'center' | 'justify') {
  const decorations: Decoration[] = []
  const { selection } = tr
  if (selection instanceof CellSelection) {
    selection.forEachCell((cell, pos) => {
      decorations.push(
        Decoration.node(pos, pos + cell.nodeSize, {
          style: `text-align: ${align};`
        })
      )
    })
  }
  return tr//.setMeta(alignCellPluginKey, { decorations })
}