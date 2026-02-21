import { PluginKey, Plugin } from "@tiptap/pm/state"
import type { TableContext } from "./types"
import { selectTable } from "../utils/selectTable"
import { fitWidth } from "../utils/fitWidth"
import { setTableColor } from "../utils/setTableColor"
import { styleTable } from "../utils/styleTable"
import { clearTableContent } from "../utils/clearTableContent"

export const tableMenuPluginKey = new PluginKey('tableMenuPluginKey')

export const TableMenuPlugin = () => {
  return {
    plugin: new Plugin<TableContext>({
      key: tableMenuPluginKey,

      state: {
        init: () => {
          return {
            pos: null,
            pendingCommand: null
          }
        },
        apply(tr, value) {
          const meta = tr.getMeta('updateTable')
          if (meta) {
            return {
              pos: meta.pos,
              pendingCommand: meta.pendingCommand
            }
          }
          return value
        }
      },

      appendTransaction(_, __, newState) {
        const state = tableMenuPluginKey.getState(newState)
        if (state?.pos === null || state?.pendingCommand === null) {
          return null
        }

        const tr = newState.tr
        const { pos, pendingCommand } = state
        switch ((pendingCommand as NonNullable<TableContext['pendingCommand']>).action) {
          case 'selectTable': return selectTable(tr, pos)
          case 'fitTableWidth': return fitWidth(tr, pos)
          case 'setTableColor': return setTableColor(tr, pos, pendingCommand.options.color, pendingCommand.options.target)
          case 'setTableStyle': return styleTable(tr, pos, pendingCommand.options.styles)
          case 'clearTableContent': return clearTableContent(tr, pos)
          default:
            return null
        }
      }
    })
  }
}