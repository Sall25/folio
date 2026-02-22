import { Table } from "@tiptap/extension-table"
import { tableContextPlugin } from "../plugins"

export const TableMenuExtension = Table.extend({
  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() || []),
      tableContextPlugin
    ]
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      color: {
        default: null,
        parseHTML(element) {
          return element.style.color
        },
        renderHTML(attributes) {
          return {
            style: `color: ${attributes.color}`
          }
        },
      },
      background: {
        default: null,
        parseHTML(element) {
          return element.style.background
        },
        renderHTML(attributes) {
          return {
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
})