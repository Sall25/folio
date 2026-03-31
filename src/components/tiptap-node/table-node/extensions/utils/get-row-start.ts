import { Node as PMNode } from "@tiptap/pm/model";

export function getRowStart(
  tableNode: PMNode,
  tablePos: number,
  rowIndex: number,
) {
  let rowStart = tablePos + 1;
  for (let i = 0; i < rowIndex; i++) {
    rowStart += tableNode.child(i).nodeSize;
  }
  return rowStart;
}
