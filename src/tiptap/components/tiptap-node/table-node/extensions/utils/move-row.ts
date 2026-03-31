import { Transaction } from "@tiptap/pm/state";
import { Node } from "@tiptap/pm/model";
import { CellSelection } from "@tiptap/pm/tables";
import { TableMap } from "@tiptap/pm/tables";

export function moveRow(
  tr: Transaction,
  from: number,
  to: number,
): Transaction {
  const sel = tr.selection;

  if (!(sel instanceof CellSelection)) return tr;

  const table = sel.$anchorCell.node(-1);
  const tableStart = sel.$anchorCell.start(-1);
  const map = TableMap.get(table);

  if (from < 0 || to < 0 || from >= map.height || to >= map.height) return tr;

  const rows = [] as Node[];
  table.forEach((row) => rows.push(row));

  const [moved] = rows.splice(from, 1);
  rows.splice(to, 0, moved);

  const newTable = table.type.create(table.attrs, rows, table.marks);
  return tr.replaceWith(
    tableStart - 1,
    tableStart - 1 + table.nodeSize,
    newTable,
  );
}
