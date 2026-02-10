/* eslint-disable @typescript-eslint/no-explicit-any */

import { Table } from "@tiptap/extension-table";
import { tableMenuPlugin } from "./plugins/tableMenuPlugin";
import { activeCellPlugin } from "./plugins/activeCellPlugin";
// import { activeColumnPlugin } from "./activeColumnPlugin";
import { alignCellPluginKey } from "./plugins/alignPlugin";
import type { ColumnStyleProps, RowStyleProps, SelectColumnOptions, SelectRowOptions, SortColumnOptions, SortRowOptions } from "./types";
import { CellSelection, TableMap } from "prosemirror-tables";
import { findParentNodeClosestToPos } from "@tiptap/react";
import { Node as PMNode, Slice } from "@tiptap/pm/model";
import { Decoration } from "@tiptap/pm/view";

function getCellSortValue(cell: PMNode): string | number {
  const text = cell.textContent.trim()

  // try number first
  const num = Number(text)
  if (!Number.isNaN(num)) return num

  return text.toLowerCase()
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableMore: {
      sortColumn: (options: SortColumnOptions) => ReturnType,

      selectColumn: (options: SelectColumnOptions) => ReturnType,

      alignColumn: (align: 'left' | 'right' | 'center' | 'justify') => ReturnType,

      setColumnStyle: (styles: ColumnStyleProps) => ReturnType,

      clearColumn: () => ReturnType,

      sortRow: (options: SortRowOptions) => ReturnType,

      selectRow: (options: SelectRowOptions) => ReturnType,

      setRowStyle: (styles: RowStyleProps) => ReturnType,

      clearRow: () => ReturnType,

      clearSelectedCells: () => ReturnType,

      setSelectedCellsStyle: (styles: RowStyleProps) => ReturnType,

      addColumnToRight: () => ReturnType,

      addRowAtBottomTable: () => ReturnType,

      addColumnToRightTable: () => ReturnType
    }
  }
}

export const TableMenuExtension = Table.extend({
  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() || []),
      tableMenuPlugin,
      activeCellPlugin
    ]
  },
  addCommands() {
    return {
      ...this.parent?.(),
      sortColumn(options) {
        return ({ state, dispatch }) => {
          const { selection } = state
          const { $from } = selection


          const table = findParentNodeClosestToPos(
            $from,
            node => node.type.spec.tableRole === "table"
          )

          if (!table) return false

          const { node: tableNode, pos: tablePos } = table
          const { columnIndex, direction, hasHeader = true } = options

          const map = TableMap.get(tableNode)

          if (columnIndex < 0 || columnIndex >= map.width) {
            return false
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
              return direction === "asc" ? -1 : 1
            }
            if (a.sortValue > b.sortValue) {
              return direction === "asc" ? 1 : -1
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

          if (dispatch) {
            dispatch(
              state.tr.replaceWith(
                tablePos,
                tablePos + tableNode.nodeSize,
                newTable
              )
            )
          }

          return true
        }
      },
      selectColumn(options) {
        return ({ state, dispatch }) => {
          const { columnIndex, tablePos } = options

          const table = state.doc.nodeAt(tablePos)
          if (!table) return false

          const map = TableMap.get(table)

          const topCellPos =
            tablePos + map.map[columnIndex]

          const bottomCellPos =
            tablePos + map.map[
            (map.height - 1) * map.width + columnIndex
            ]

          const $anchor = state.doc.resolve(topCellPos + 1)
          const $head = state.doc.resolve(bottomCellPos + 1)

          if (dispatch) {
            dispatch(
              state.tr.setSelection(new CellSelection($anchor, $head))
            )
          }


          return true
        }
      },
      alignColumn(align) {
        return ({ state, tr, dispatch }) => {
          const decorations: Decoration[] = []
          const { selection } = state
          if (selection instanceof CellSelection) {
            selection.forEachCell((cell, pos) => {
              decorations.push(
                Decoration.node(pos, pos + cell.nodeSize, {
                  style: `text-align: ${align};`
                })
              )
            })
          }

          if (dispatch) {
            dispatch(
              tr.setMeta(alignCellPluginKey, { decorations })
            )
          }
          return true
        }
      },
      setColumnStyle(styles) {
        return ({ state, dispatch }) => {
          let tr = state.tr

          const { selection } = state
          if (selection instanceof CellSelection) {
            selection.forEachCell((cell, pos) => {
              tr = tr.setNodeMarkup(pos, null, {
                ...cell.attrs,
                ...styles
              })
            })
          }

          if (dispatch) {
            dispatch(
              tr
            )
          }
          return true
        }
      },
      clearColumn() {
        return ({ state, dispatch }) => {
          const { selection } = state

          if (!(selection instanceof CellSelection)) {
            return false
          }

          const tr = state.tr

          tr.replaceSelection(Slice.empty)

          if (dispatch) dispatch(tr)
          return true
        }
      },
      selectRow(options) {
        return ({ state, dispatch }) => {

          const { rowIndex, tablePos } = options

          const table = state.doc.nodeAt(tablePos)
          if (!table) return false

          const map = TableMap.get(table)

          if (rowIndex < 0 || rowIndex >= map.height) {
            return false
          }

          const leftCellPos =
            tablePos + map.map[rowIndex * map.width]

          const rightCellPos =
            tablePos + map.map[
            rowIndex * map.width + (map.width - 1)
            ]

          const $anchor = state.doc.resolve(leftCellPos + 1)
          const $head = state.doc.resolve(rightCellPos + 1)

          if (dispatch) {
            dispatch(
              state.tr.setSelection(new CellSelection($anchor, $head))
            )
          }

          return true
        }
      },
      setRowStyle(styles: RowStyleProps) {
        return ({ state, dispatch }) => {
          let tr = state.tr

          const { selection } = state
          if (selection instanceof CellSelection) {
            selection.forEachCell((cell, pos) => {
              tr = tr.setNodeMarkup(pos, null, {
                ...cell.attrs,
                ...styles
              })
            })
          }

          if (dispatch) {
            dispatch(
              tr
            )
          }
          return true
        }
      },
      sortRow(options) {
        return ({ state, dispatch }) => {
          const { selection } = state
          const { $from } = selection

          const table = findParentNodeClosestToPos(
            $from,
            node => node.type.spec.tableRole === "table"
          )
          if (!table) return false

          const { node: tableNode, pos: tablePos } = table
          const { rowIndex, direction } = options

          const map = TableMap.get(tableNode)

          if (rowIndex < 0 || rowIndex >= map.height) {
            return false
          }

          type ColumnInfo = {
            colIndex: number
            sortValue: string | number
          }

          const columns: ColumnInfo[] = []

          // 1️⃣ Collect sort values from the target row
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

          // 2️⃣ Sort columns
          columns.sort((a, b) => {
            if (a.sortValue < b.sortValue) {
              return direction === "asc" ? -1 : 1
            }
            if (a.sortValue > b.sortValue) {
              return direction === "asc" ? 1 : -1
            }
            return 0
          })

          // 3️⃣ Rebuild rows with reordered cells
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

          if (dispatch) {
            dispatch(
              state.tr.replaceWith(
                tablePos,
                tablePos + tableNode.nodeSize,
                newTable
              )
            )
          }

          return true
        }
      },
      clearRow() {
        return ({ state, dispatch }) => {
          const { selection } = state

          if (!(selection instanceof CellSelection)) {
            return false
          }

          const tr = state.tr

          tr.replaceSelection(Slice.empty)

          if (dispatch) dispatch(tr)
          return true
        }
      },
      clearSelectedCells() {
        return ({ state, dispatch }) => {
          const { selection } = state

          if (!(selection instanceof CellSelection)) {
            return false
          }

          const tr = state.tr

          tr.replaceSelection(Slice.empty)

          if (dispatch) dispatch(tr)
          return true
        }
      },
      setSelectedCellsStyle(styles) {
        return ({ state, dispatch }) => {
          let tr = state.tr

          const { selection } = state
          if (selection instanceof CellSelection) {
            selection.forEachCell((cell, pos) => {
              tr = tr.setNodeMarkup(pos, null, {
                ...cell.attrs,
                ...styles
              })
            })
          }

          if (dispatch) {
            dispatch(
              tr
            )
          }
          return true
        }
      },
      addColumnToRight() {
        return ({ state, dispatch, commands }) => {
          const { selection } = state
          const { $from } = selection

          const table = findParentNodeClosestToPos(
            $from,
            node => node.type.spec.tableRole === "table"
          )

          if (!table) return false

          const tableNode = table.node
          const tablePos = table.pos

          const map = TableMap.get(tableNode)
          const lastColIndex = map.width - 1

          // pick a cell in the last column (row 0 is fine)
          const cellPos =
            tablePos +
            map.map[lastColIndex] +
            1

          const $cell = state.doc.resolve(cellPos)

          const tr = state.tr
            .setSelection(new CellSelection($cell))

          if (dispatch) dispatch(tr)

          return commands.addColumnAfter()
        }
      },
      addRowAtBottomTable() {
        return ({ state, dispatch }) => {
          const { selection, schema } = state
          const { $from } = selection

          const table = findParentNodeClosestToPos(
            $from,
            node => node.type.spec.tableRole === "table"
          )

          if (!table) return false

          const tableNode = table.node
          const tablePos = table.pos

          const rowType = schema.nodes.tableRow
          const cellType = schema.nodes.tableCell
          // const headerCellType = schema.nodes.tableHeader

          if (!tableNode.firstChild) return false

          const columnCount = tableNode.firstChild.childCount

          // Build a new row with the correct number of cells
          const cells = [] as any[]
          for (let i = 0; i < columnCount; i++) {
            cells.push(
              cellType.createAndFill()
            )
          }

          const newRow = rowType.create(
            null,
            cells
          )

          const newTable = tableNode.type.create(
            tableNode.attrs,
            [
              ...tableNode.content.content,
              newRow,
            ],
            tableNode.marks
          )

          const tr = state.tr.replaceWith(
            tablePos,
            tablePos + tableNode.nodeSize,
            newTable
          )

          if (dispatch) {
            dispatch(tr)
          }
          return true
        }
      },
      addColumnToRightTable() {
        return ({ state, dispatch }) => {
          const { selection, schema } = state
          const { $from } = selection

          const table = findParentNodeClosestToPos(
            $from,
            node => node.type.spec.tableRole === "table"
          )

          if (!table) return false

          const tableNode = table.node
          const tablePos = table.pos

          const newRows = [] as any[]

          tableNode.forEach(row => {
            const cells = [] as any[]

            row.forEach(cell => {
              cells.push(cell)
            })

            // 👇 append a new empty cell
            const cellType =
              cells[0].type.spec.tableRole === "cell"
                ? schema.nodes.tableHeader
                : schema.nodes.tableCell

            cells.push(
              cellType.createAndFill()
            )

            newRows.push(
              row.type.create(
                row.attrs,
                cells,
                row.marks
              )
            )
          })

          const newTable = tableNode.type.create(
            tableNode.attrs,
            newRows,
            tableNode.marks
          )

          const tr = state.tr.replaceWith(
            tablePos,
            tablePos + tableNode.nodeSize,
            newTable
          )

          // restore original selection
          //  tr.setSelection(selection)

          if (dispatch) {
            dispatch(tr)
          }
          return true
        }
      },
    }
  }
});