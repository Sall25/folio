import { PluginKey, Plugin } from "@tiptap/pm/state";
import type { CellContext } from "./types";
import { clearSelectionContent, selectCell, styleSelection } from "../utils";

export const tableCellMenuPluginKey = new PluginKey('tableCellMenuPlugin')

export const TableCellMenuPlugin = () => {
  return {
    plugin: new Plugin<CellContext>({
      key: tableCellMenuPluginKey,

      state: {
        init: () => {
          return {
            pos: -1,
            pendingCommand: null
          }
        },
        apply(tr, value) {
          const meta = tr.getMeta('updateCell')
          if (meta) {
            return {
              pos: meta.pos,
              pendingCommand: meta.pendingCommand
            }
          }
          return value
        },
      },

      appendTransaction(_, __, newState) {
        const state = tableCellMenuPluginKey.getState(newState)
        if (state?.pos === -1 || state?.pendingCommand === null) {
          return null
        }
        let tr = newState.tr
        tr = tr.setMeta('updateCell', {
          pos: -1,
          pendingCommand: null
        })
        const { pendingCommand, pos } = state
        switch ((pendingCommand as NonNullable<CellContext['pendingCommand']>).action) {
          case 'selectCell': return selectCell(tr, pos)
          case 'setCellStyle': return styleSelection(tr, pendingCommand.options.styles)
          case 'clearCellContent': return clearSelectionContent(tr)
          default:
            return tr
        }
      },
    })
  }
}