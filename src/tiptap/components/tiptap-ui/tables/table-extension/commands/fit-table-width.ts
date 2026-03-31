import type { RawCommands } from "@tiptap/core"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fitTableWidth: {
      fitTableWidth: (pos: number) => ReturnType
    }
  }
}

export const fitTableWidth: RawCommands['fitTableWidth'] =
  (pos) =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('updateTable', { pos })
        )
      }
      return true
    }