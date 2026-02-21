import { TableCell } from "@tiptap/extension-table";
import {
  styleCell as styleCellCommand,
  selectCell as selectCellCommand
} from '../commands'
import { activeCellPlugin, TableCellMenuPlugin } from "../plugins";

export const CustomTableCell = TableCell.extend({
  name: 'tableCell',

  addAttributes() {
    return {
      ...this.parent?.(),
      color: {
        default: null,
        parseHTML(element) {
          return element.getAttribute('data-color')
        },
        renderHTML(attributes) {
          if (!attributes.color) return {}
          return {
            'data-color': attributes.color,
            style: `color: ${attributes.color}`
          }
        },
      },
      background: {
        default: null,
        parseHTML(element) {
          return element.getAttribute('data-background')
        },
        renderHTML(attributes) {
          if (!attributes.background) return {}

          return {
            'data-background': attributes.background,
            style: `background: ${attributes.background}`
          }
        },
      },
      textAlign: {
        default: null,
        parseHTML(element) {
          return element.style.textAlign
        },
        renderHTML(attributes) {
          return {
            style: `text-align: ${attributes.textAlign}`
          }
        },
      }
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),
      selectCell(cellPos) {
        return selectCellCommand(cellPos)
      },
      styleCell(cellPos, styles) {
        return styleCellCommand(cellPos, styles)
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      activeCellPlugin,
      TableCellMenuPlugin().plugin
    ]
  },
})