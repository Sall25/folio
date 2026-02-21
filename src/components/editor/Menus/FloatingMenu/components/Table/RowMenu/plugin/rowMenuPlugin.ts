import { Plugin, PluginKey } from "@tiptap/pm/state"
import type { RowContext } from "../types";
import { clearSelection, clearSelectionContent, selectRow, sortRow, styleSelection } from "../utils";

export const rowMenuPluginKey = new PluginKey('rowMenuPlugin')

export const RowMenuPlugin = () => {
  return {
    plugin: new Plugin<RowContext>({
      key: rowMenuPluginKey,

      state: {
        init: () => {
          return {
            rowIndex: -1,
            tablePos: -1,
            pendingCommand: null
          }
        },

        apply(tr, value) {
          const meta = tr.getMeta('updateRow')
          if (meta) {
            console.log('meta sent')
            return {
              rowIndex: meta.rowIndex,
              tablePos: meta.tablePos,
              pendingCommand: meta.pendingCommand
            }
          }
          return value
        },
      },

      appendTransaction(_, __, newState) {
        const state = rowMenuPluginKey.getState(newState)
        if (state?.rowIndex === -1 || state?.tablePos === -1 || state?.pendingCommand === null) {
          return null
        }
        let tr = newState.tr
        tr = tr.setMeta('updateRow', {
          rowIndex: -1,
          tablePos: -1,
          pendingCommand: null
        })

        const { rowIndex, tablePos, pendingCommand } = state
        switch ((pendingCommand as NonNullable<RowContext['pendingCommand']>).action) {
          case 'selectRow': return selectRow(tr, rowIndex, tablePos)
          case 'sortRow': return sortRow(tr, rowIndex, tablePos, pendingCommand.options?.ord)
          case 'setRowStyle': return styleSelection(tr, pendingCommand.options)
          case 'clearRowContent': return clearSelectionContent(tr)
          case 'deselectRow': return clearSelection(tr)
          default:
            return tr
        }
      },
    })
  }
}