import { Plugin, PluginKey } from "@tiptap/pm/state"
import type { ColumnContext } from "../types";
import { alignSelection, clearSelection, clearSelectionContent, selectColumn, sortColumn, styleSelection } from "../utils";

export const columnMenuPluginKey = new PluginKey('columnMenuPlugin')

export const ColumnMenuPlugin = () => {
  return {
    plugin: new Plugin<ColumnContext>({
      key: columnMenuPluginKey,

      state: {
        init: () => {
          return {
            columnIndex: -1,
            tablePos: -1,
            pendingCommand: null
          }
        },

        apply(tr, value) {
          const meta = tr.getMeta('updateColumn')
          if (meta) {
            return {
              columnIndex: meta.columnIndex,
              tablePos: meta.tablePos,
              pendingCommand: meta.pendingCommand
            }
          }
          return value
        },
      },

      appendTransaction(_, __, newState) {
        const state = columnMenuPluginKey.getState(newState)
        if (state?.columnIndex === -1 || state?.tablePos === -1 || state?.pendingCommand === null) {
          return null
        }
        let tr = newState.tr
        tr = tr.setMeta('updateColumn', {
          columnIndex: -1,
          tablePos: -1,
          pendingCommand: null
        })

        const { columnIndex, tablePos, pendingCommand } = state
        switch ((pendingCommand as NonNullable<ColumnContext['pendingCommand']>).action) {
          case 'selectColumn': return selectColumn(tr, tablePos, columnIndex)
          case 'sortColumn': return sortColumn(tr, tablePos, columnIndex, pendingCommand.options?.ord, pendingCommand.options?.hasHeader)
          case 'alignColumn': return alignSelection(tr, pendingCommand.options ?? 'justify')
          case 'setColumnStyle': return styleSelection(tr, pendingCommand.options)
          case 'clearColumnContent': return clearSelectionContent(tr)
          case 'deselectColumn': return clearSelection(tr)
          default:
            return tr
        }
      },
    })
  }
}