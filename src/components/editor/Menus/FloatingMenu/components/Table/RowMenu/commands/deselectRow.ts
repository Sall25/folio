import type { RawCommands } from "@tiptap/core"
import type { RowContext } from "../types"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    deselectRow: {
      deselectRow: (rowIndex: number, tablePos: number) => ReturnType
    }
  }
}

export const deselectRow: RawCommands['deselectRow'] =
  (rowIndex, tablePos) =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('updateRow', ({
            rowIndex,
            tablePos,
            pendingCommand: { action: 'deselectRow' }

          }) as RowContext)
        )
      }
      return true
    } 