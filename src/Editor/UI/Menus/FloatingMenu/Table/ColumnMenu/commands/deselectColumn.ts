import type { RawCommands } from "@tiptap/core"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    deselectColumn: {
      deselectColumn: (columnIndex: number, tablePos: number) => ReturnType
    }
  }
}

export const deselectColumn: RawCommands['deselectColumn'] =
  (columnIndex, tablePos) =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('updateColumn', {
            columnIndex,
            tablePos,
            pendingCommand: { action: 'deselectColumn' }
          })
        )
      }
      return true
    }