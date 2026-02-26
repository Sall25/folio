import { Table } from "@tiptap/extension-table"
import { tableContextPlugin } from "../plugins"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { TableComponent } from "../components"

type Col = {
  index: number,
  width: number
}

type Row = {
  index: number,
  height: number
}


interface TableMenuStorage {
  currentCol: Col | null;
  currentRow: Row | null;
  colCount: number;
  rowCount: number;
  cols: number[];
  rows: number[];
  overLastColumn: boolean;
  overLastRow: boolean;
}

declare module '@tiptap/core' {
  interface Storage {
    table: TableMenuStorage;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TableMenuExtension = Table.extend<any, TableMenuStorage>({
  addStorage() {
    return {
      ...this.parent?.(),
      currentCol: null,
      currentRow: null,
      colCount: 0,
      rowCount: 0,
      cols: [],
      rows: [],
      overLastColumn: false,
      overLastRow: false
    }
  },
  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() || []),
      tableContextPlugin(this.editor),

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

  addNodeView() {
    return ReactNodeViewRenderer(TableComponent)
  },
})