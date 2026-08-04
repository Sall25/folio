import type { Transaction } from "@tiptap/pm/state";
import { CellSelection, TableMap } from "prosemirror-tables";

export function selectRow(tr: Transaction, rowIndex: number, tablePos: number) {
  const table = tr.doc.nodeAt(tablePos);
  if (!table) return tr;

  if (table.type.name !== "table") {
    return tr;
  }

  const map = TableMap.get(table);

  if (rowIndex < 0 || rowIndex >= map.height) {
    return tr;
  }

  const leftCellPos = tablePos + map.map[rowIndex * map.width];

  const rightCellPos =
    tablePos + map.map[rowIndex * map.width + (map.width - 1)];

  const $anchor = tr.doc.resolve(leftCellPos + 1);
  const $head = tr.doc.resolve(rightCellPos + 1);

  return tr.setSelection(new CellSelection($anchor, $head));
}
