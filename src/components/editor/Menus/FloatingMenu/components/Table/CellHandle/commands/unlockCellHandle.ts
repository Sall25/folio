import type { RawCommands } from "@tiptap/core"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    unlockCellHandle: {
      unlockCellHandle: () => ReturnType
    }
  }
}

export const unlockCellHandle: RawCommands['unlockCellHandle'] =
  () =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('lockCellHandle', false)
        )
      }
      return true
    }