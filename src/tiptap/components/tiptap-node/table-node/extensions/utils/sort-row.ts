import type { Transaction } from "@tiptap/pm/state";
import { TableMap } from "prosemirror-tables";
import { Node as PMNode } from "@tiptap/pm/model";

function getCellSortValue(cell: PMNode): string | number {
  const text = cell.textContent.trim()

  // try number first
  const num = Number(text)
  if (!Number.isNaN(num)) return num

  return text.toLowerCase()
}

export function sortRow(tr: Transaction, rowIndex: number, tablePos: number, ord: 'asc' | 'desc') {

  const tableNode = tr.doc.nodeAt(tablePos)
  if (!tableNode) return tr

  const map = TableMap.get(tableNode)

  if (rowIndex < 0 || rowIndex >= map.height) {
    return tr
  }

  type ColumnInfo = {
    colIndex: number
    sortValue: string | number
  }

  const columns: ColumnInfo[] = []

  // Collect sort values from the target row
  for (let colIndex = 0; colIndex < map.width; colIndex++) {
    const cellIndex = rowIndex * map.width + colIndex
    const cellPos = map.map[cellIndex]

    if (cellPos == null) continue

    const cellNode = tableNode.nodeAt(cellPos)
    if (!cellNode) continue

    columns.push({
      colIndex,
      sortValue: getCellSortValue(cellNode),
    })
  }

  // Sort columns
  columns.sort((a, b) => {
    if (a.sortValue < b.sortValue) {
      return ord === "asc" ? -1 : 1
    }
    if (a.sortValue > b.sortValue) {
      return ord === "asc" ? 1 : -1
    }
    return 0
  })

  //  Rebuild rows with reordered cells
  const newRows: PMNode[] = []

  for (let row = 0; row < map.height; row++) {
    const rowNode = tableNode.child(row)
    const newCells: PMNode[] = []

    for (const col of columns) {
      const cellIndex = row * map.width + col.colIndex
      const cellPos = map.map[cellIndex]

      if (cellPos == null) continue

      const cellNode = tableNode.nodeAt(cellPos)
      if (cellNode) {
        newCells.push(cellNode)
      }
    }

    newRows.push(
      rowNode.type.create(
        rowNode.attrs,
        newCells,
        rowNode.marks
      )
    )
  }

  const newTable = tableNode.type.create(
    tableNode.attrs,
    newRows,
    tableNode.marks
  )

  return tr.replaceWith(
    tablePos,
    tablePos + tableNode.nodeSize,
    newTable
  )
}