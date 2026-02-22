import type { Schema } from "@tiptap/pm/model"

export function createTable(schema: Schema, rows: number, cols: number) {
  const { table, tableRow, tableCell } = schema.nodes

  const rowNodes = []

  for (let r = 0; r < rows; r++) {
    const cells = []

    for (let c = 0; c < cols; c++) {
      cells.push(
        tableCell.createAndFill()! // ensures proper paragraph inside
      )
    }

    rowNodes.push(tableRow.create(null, cells))
  }

  return table.create(null, rowNodes)
}