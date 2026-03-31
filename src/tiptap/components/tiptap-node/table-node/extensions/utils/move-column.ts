import { Transaction } from "@tiptap/pm/state";
import { Node } from "@tiptap/pm/model";
import { CellSelection } from "@tiptap/pm/tables";
import { TableMap } from "@tiptap/pm/tables";

export function moveColumn(
  tr: Transaction,
  from: number,
  to: number,
): Transaction {
  const sel = tr.selection;

  if (!(sel instanceof CellSelection)) return tr;

  const table = sel.$anchorCell.node(-1);
  const tableStart = sel.$anchorCell.start(-1);
  const map = TableMap.get(table);

  if (from < 0 || to < 0 || from >= map.width || to >= map.width) return tr;

  const newRows: Node[] = [];

  table.forEach((row) => {
    const cells: Node[] = [];
    row.forEach((cell) => cells.push(cell));

    const [moved] = cells.splice(from, 1);
    cells.splice(to, 0, moved);

    newRows.push(row.type.create(row.attrs, cells, row.marks));
  });

  const newTable = table.type.create(table.attrs, newRows, table.marks);
  return tr.replaceWith(
    tableStart - 1,
    tableStart - 1 + table.nodeSize,
    newTable,
  );
}
