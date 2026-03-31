import { Node as PMNode } from "@tiptap/pm/model";

export function getRowRange(
  tablePos: number,
  tableNode: PMNode,
  rowIndex: number,
) {
  let offset = 0;

  for (let i = 0; i < rowIndex; i++) {
    offset += tableNode.child(i).nodeSize;
  }

  const rowNode = tableNode.child(rowIndex);
  const rowStart = tablePos + 1 + offset;
  const rowEnd = rowStart + rowNode.nodeSize;

  return { rowStart, rowEnd };
}
