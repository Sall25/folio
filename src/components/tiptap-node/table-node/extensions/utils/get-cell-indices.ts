import { Node as PMNode } from "@tiptap/pm/model"
import { TableMap } from "prosemirror-tables"

export function getCellIndices(tableNode: PMNode, cellPos: number, tablePos: number) {
  const map = TableMap.get(tableNode)
  const cellPosInTable = cellPos - tablePos - 1
  const rect = map.findCell(cellPosInTable)

  return {
    map,
    columnIndex: rect.left,
    rowIndex: rect.top,
  }
}
