import type { RawCommands } from "@tiptap/core"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    clearRowContent: {
      clearRowContent: (rowIndex: number, tablePos: number) => ReturnType
    }
  }
}

export const clearRowContent: RawCommands['clearRowContent'] =
  (rowIndex, tablePos) =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('updateRow', {
            rowIndex,
            tablePos,
            pendingCommand: { action: 'clearRowContent' }
          })
        )
      }
      return true
    }