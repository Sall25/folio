import type { RawCommands } from "@tiptap/core"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    selectCell: {
      selectCell: (cellPos: number) => ReturnType
    }
  }
}

export const selectCell: RawCommands['selectCell'] =
  (cellPos) =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('updateCell', {
            pos: cellPos,
            pendingCommand: {
              action: 'selectCell',
              options: { pos: cellPos }
            }
          }))
      }
      return true
    }