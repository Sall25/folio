import type { RawCommands } from "@tiptap/core"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lockCellHandle: {
      lockCellHandle: () => ReturnType
    }
  }
}

export const lockCellHandle: RawCommands['lockCellHandle'] =
  () =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('lockCellHandle', true)
        )
      }
      return true
    }