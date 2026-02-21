import type { RawCommands } from "@tiptap/core"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    selectColumn: {
      selectColumn: (columnIndex: number, tablePos: number) => ReturnType
    }
  }
}

export const selectColumn: RawCommands['selectColumn'] =
  (columnIndex, tablePos) =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('updateColumn', {
            columnIndex,
            tablePos,
            pendingCommand: { action: 'selectColumn', options: { columnIndex, tablePos } }
          })
        )
      }
      return true
    }