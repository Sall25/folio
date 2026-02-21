import type { Transaction } from "@tiptap/pm/state";
import type { SortOrder } from "../types";
import { TableMap } from "prosemirror-tables";
import { Node as PMNode } from "@tiptap/pm/model";

function getCellSortValue(cell: PMNode): string | number {
  const text = cell.textContent.trim()

  // try number first
  const num = Number(text)
  if (!Number.isNaN(num)) return num

  return text.toLowerCase()
}

export function sortColumn(tr: Transaction, tablePos: number, columnIndex: number, ord: SortOrder, hasHeader: boolean = true) {

  const tableNode = tr.doc.nodeAt(tablePos)

  if (!tableNode) return tr

  const map = TableMap.get(tableNode)

  if (columnIndex < 0 || columnIndex >= map.width) {
    return tr
  }

  const startRow = hasHeader ? 1 : 0

  type RowInfo = {
    rowNode: PMNode
    sortValue: string | number
  }

  const rows: RowInfo[] = []

  for (let rowIndex = startRow; rowIndex < map.height; rowIndex++) {
    const rowNode = tableNode.child(rowIndex)

    const cellIndex = rowIndex * map.width + columnIndex
    const cellPos = map.map[cellIndex]

    if (cellPos == null) continue

    const cellNode = tableNode.nodeAt(cellPos)
    if (!cellNode) continue

    rows.push({
      rowNode,
      sortValue: getCellSortValue(cellNode),
    })
  }

  rows.sort((a, b) => {
    if (a.sortValue < b.sortValue) {
      return ord === "asc" ? -1 : 1
    }
    if (a.sortValue > b.sortValue) {
      return ord === "asc" ? 1 : -1
    }
    return 0
  })

  const newRows: PMNode[] = []

  if (hasHeader) {
    newRows.push(tableNode.child(0))
  }

  for (const row of rows) {
    newRows.push(row.rowNode)
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