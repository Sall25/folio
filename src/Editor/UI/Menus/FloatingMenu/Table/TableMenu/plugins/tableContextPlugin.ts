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

export const tableContextPlugin = new Plugin({
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
        if (!ctx) return false

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