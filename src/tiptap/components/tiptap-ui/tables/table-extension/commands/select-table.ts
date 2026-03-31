import type { RawCommands } from "@tiptap/core"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    selectTable: {
      selectTable: (pos: number) => ReturnType
    }
  }
}

export const selectTable: RawCommands['selectTable'] =
  (pos) =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('updateTable', { pos })
        )
      }
      return true
    }