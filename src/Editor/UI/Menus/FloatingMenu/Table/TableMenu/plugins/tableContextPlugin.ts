import type { Editor } from "@tiptap/core";
import { getCellIndices, getEdgeFlags, getHeaderCellRect, getRowRange, getRowRect, getRowStart, getTableContext } from "../../utils/utils";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const tableMenuPluginKey = new PluginKey<{
  columnIndex: number, // Hovered column
  rowIndex: number, // Hovered row
  isLastColumn: boolean, // Show 'Add column' UI
  isLastRow: boolean, // Show 'Add row' UI
  rowStart: number, // PM position to insert row after
  rowEnd: number, // row end position
  headerCellRect: DOMRect | null, // Anchor column menu
  rowRect: DOMRect | null, // Anchor row menu
  parentTableDOM: HTMLElement | null, // Table Measurements,
  lastColumnIndex: number | null,
  lastRowIndex: number | null,
  tablePos: number | null
}>('tableMenuPlugin')

export const tableContextPlugin = (editor: Editor) => {
  return new Plugin({
    key: tableMenuPluginKey,

    state: {
      init: () => {
        return {
          columnIndex: 0,
          rowIndex: 0,
          isLastColumn: false,
          isLastRow: false,
          rowStart: 0,
          rowEnd: 0,
          headerCellRect: null,
          rowRect: null,
          parentTableDOM: null,
          lastColumnIndex: null,
          lastRowIndex: null,
          tablePos: null
        }
      },

      apply: (tr, value) => {
        const meta = tr.getMeta(tableMenuPluginKey)
        return meta ? meta : value
      },
    },
    props: {
      handleDOMEvents: {
        // inside props.handleDOMEvents
        mousemove(view, event) {
          const ctx = getTableContext(view, event)
          if (!ctx) {

            view.dispatch(
              view.state.tr.setMeta('hideColumnDragHandle', true)
            )
            view.dispatch(
              view.state.tr.setMeta('hideRowDragHandle', true)
            )
            return false
          }

          const { cell, table } = ctx
          const tableContainer = view.nodeDOM(table.pos) as HTMLElement | null
          if (!tableContainer) return false

          const actualTable = tableContainer.querySelector("table")

          if (!actualTable) return false

          const parentTableDOM = actualTable


          const { map, columnIndex, rowIndex } = getCellIndices(
            table.node,
            cell.pos,
            table.pos
          )

          const { isLastColumn, isLastRow } = getEdgeFlags(map, columnIndex, rowIndex)

          const rowStart = getRowStart(table.node, table.pos, rowIndex)

          const headerCellRect = getHeaderCellRect(
            view,
            table.node,
            table.pos,
            columnIndex
          )

          const rowRect = getRowRect(view, rowStart)

          // Perf guard
          const meta = tableMenuPluginKey.getState(view.state)
          if (
            meta?.lastColumnIndex === columnIndex &&
            meta?.lastRowIndex === rowIndex
          ) return false

          const { rowEnd } = getRowRange(table.pos, table.node, rowIndex)

          const tablePos = table.pos

          const cols = []
          const rows = []

          for (let col = 0; col < map.width; col++) {
            const rect = getHeaderCellRect(view, table.node, table.pos, col)
            if (!rect) continue

            cols.push(rect.width)

          }
          for (let row = 0; row < map.height; row++) {
            const start = getRowStart(table.node, table.pos, row)
            const rect = getRowRect(view, start)
            if (!rect) continue

            rows.push(rect.height)
          }

          editor.storage.table.cols = cols
          editor.storage.table.rows = rows

          editor.storage.table.currentCol = {
            index: columnIndex,
            width: headerCellRect?.width ?? 0
          }

          editor.storage.table.currentRow = {
            index: rowIndex,
            height: rowRect?.height ?? 0
          }
          editor.storage.table.colCount = map.width
          editor.storage.table.rowCount = map.height
          editor.storage.table.overLastColumn = isLastColumn
          editor.storage.table.overLastRow = isLastRow


          view.dispatch(
            view.state.tr.setMeta(tableMenuPluginKey, {
              parentTableDOM,
              columnIndex,
              rowIndex,
              lastColumnIndex: columnIndex,
              lastRowIndex: rowIndex,
              isLastColumn,
              isLastRow,
              rowStart,
              rowEnd,
              headerCellRect,
              rowRect,
              tablePos
            })
          )

          return false
        }
        ,
        mouseleave: (view) => {
          view.dispatch(
            view.state.tr.setMeta(tableMenuPluginKey, {
              columnIndex: 0,
              rowIndex: 0,
              isLastColumn: false,
              isLastRow: false,
              rowStart: 0,
              rowEnd: 0,
              headerCellRect: null,
              rowRect: null,
              parentTableDOM: null,
              lastColumnIndex: null,
              lastRowIndex: null,
              tablePos: null
            })
          )



        }
      }
    }
  })
}