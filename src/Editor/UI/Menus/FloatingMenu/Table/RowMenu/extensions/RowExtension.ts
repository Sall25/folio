import { Extension } from '@tiptap/core'
import {
  selectRow as selectRowCommand,
  clearRowContent as clearRowContentCommand,
  deselectRow as deselectRowCommand,
  setRowStyle as setRowStyleCommand,
  sortRow as sortRowCommand
} from '../commands'

import { RowMenuPlugin } from '../plugin'

export const RowExtension = Extension.create({
  name: 'rowMenuExtension',

  addProseMirrorPlugins() {
    return [
      RowMenuPlugin().plugin
    ]
  },

  addCommands() {
    return {
      selectRow: (rowIndex, tablePos) => {
        console.log('selectRow')
        return selectRowCommand(rowIndex, tablePos)
      },
      clearRowContent(rowIndex, tablePos) {
        return clearRowContentCommand(rowIndex, tablePos)
      },

      deselectRow(rowIndex, tablePos) {
        return deselectRowCommand(rowIndex, tablePos)
      },

      sortRow(rowIndex, tablePos, ord) {
        return sortRowCommand(rowIndex, tablePos, ord)
      },

      setRowStyle(rowIndex, tablePos, styles) {
        return setRowStyleCommand(rowIndex, tablePos, styles)
      },
    }
  }
})