import type { RawCommands } from "@tiptap/core";

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    alignColumn: {
      alignColumn: (columnIndex: number, tablePos: number, align: 'left' | 'right' | 'center' | 'justify') => ReturnType
    }
  }
}

export const alignColumn: RawCommands['alignColumn'] =
  (columnIndex, tablePos, align) =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('updateColumn', {
            columnIndex, tablePos, pendingCommand: { action: 'alignColumn', options: align }
          })
        )
      }
      return true
    }
