import type { RawCommands } from "@tiptap/core"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    selectRow: {
      selectRow: (rowIndex: number, tablePos: number) => ReturnType
    }
  }
}

export const selectRow: RawCommands['selectRow'] =
  (rowIndex, tablePos) =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('updateRow', {
            rowIndex,
            tablePos,
            pendingCommand: { action: 'selectRow', options: { rowIndex, tablePos } }
          })
        )
      }
      return true
    }