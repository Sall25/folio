import type { RawCommands } from "@tiptap/core"
import type { RowContext } from "../types"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sortRow: {
      sortRow: (rowIndex: number, tablePos: number, ord: 'asc' | 'desc') => ReturnType
    }
  }
}

export const sortRow: RawCommands['sortRow'] =
  (rowIndex, tablePos, ord) =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('updateRow', ({
            rowIndex,
            tablePos,
            pendingCommand: { action: 'sortRow', options: { rowIndex, ord } }
          }) as RowContext)
        )
      }
      return true
    }