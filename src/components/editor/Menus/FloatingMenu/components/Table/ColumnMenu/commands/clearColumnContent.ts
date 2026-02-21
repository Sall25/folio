import type { RawCommands } from "@tiptap/core"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    clearColumnContent: {
      clearColumnContent: (columnIndex: number, tablePos: number) => ReturnType
    }
  }
}

export const clearColumnContent: RawCommands['clearColumnContent'] =
  (columnIndex, tablePos) =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('updateColumn', {
            columnIndex,
            tablePos,
            pendingCommand: { action: 'clearColumnContent' }
          })
        )
      }
      return true
    }