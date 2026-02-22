import type { RawCommands } from "@tiptap/core"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sortColumn: {
      sortColumn: (columnIndex: number, tablePos: number, ord: 'asc' | 'desc', hasHeader?: boolean) => ReturnType
    }
  }
}

export const sortColumn: RawCommands['sortColumn'] =
  (columnIndex, tablePos, ord, hasHeader = true) =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('updateColumn', {
            columnIndex,
            tablePos,
            pendingCommand: { action: 'sortColumn', options: { columnIndex, ord, hasHeader } }
          })
        )
      }
      return true
    }