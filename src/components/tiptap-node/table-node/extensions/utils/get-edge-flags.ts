import { TableMap } from "prosemirror-tables";

export function getEdgeFlags(
  map: TableMap,
  columnIndex: number,
  rowIndex: number,
) {
  return {
    isLastColumn: columnIndex === map.width - 1,
    isLastRow: rowIndex === map.height - 1,
  };
}
