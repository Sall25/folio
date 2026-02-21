import { Extension } from "@tiptap/core";
import {
  alignColumn as alignCommand,
  clearColumnContent as clearContentCommand,
  deselectColumn as deselectCommand,
  selectColumn as selectCommand,
  setColumnStyle as setStyleCommand,
  sortColumn as sortCommand
} from '../commands'
import { ColumnMenuPlugin } from "../plugin";

export const ColumnExtension = Extension.create({
  name: 'columnMenuExtension',

  addProseMirrorPlugins() {
    return [
      ColumnMenuPlugin().plugin
    ]
  },

  addCommands() {
    return {
      alignColumn(columnIndex, tablePos, align) {
        return alignCommand(columnIndex, tablePos, align)
      },
      clearColumnContent(columnIndex, tablePos) {
        return clearContentCommand(columnIndex, tablePos)
      },
      deselectColumn(columnIndex, tablePos) {
        return deselectCommand(columnIndex, tablePos)
      },
      selectColumn(columnIndex, tablePos) {
        return selectCommand(columnIndex, tablePos)
      },
      setColumnStyle(columnIndex, tablePos, styles) {
        return setStyleCommand(columnIndex, tablePos, styles)
      },
      sortColumn(columnIndex, tablePos, ord, hasHeader) {
        return sortCommand(columnIndex, tablePos, ord, hasHeader)
      },
    }
  }
})