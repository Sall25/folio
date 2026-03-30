import type { Transaction } from "@tiptap/pm/state";
import { CellSelection, TableMap } from "prosemirror-tables";

export function selectColumn(
  tr: Transaction,
  tablePos: number,
  columnIndex: number,
) {
  const table = tr.doc.nodeAt(tablePos);
  if (!table) return tr;

  const map = TableMap.get(table);

  const topCellPos = tablePos + map.map[columnIndex];

  const bottomCellPos =
    tablePos + map.map[(map.height - 1) * map.width + columnIndex];

  const $anchor = tr.doc.resolve(topCellPos + 1);
  const $head = tr.doc.resolve(bottomCellPos + 1);

  console.log("selectColumn");

  return tr.setSelection(CellSelection.colSelection($anchor, $head));
}
