import type { RawCommands } from "@tiptap/core"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    clearTableContent: {
      clearTableContent: (pos: number) => ReturnType
    }
  }
}

export const clearTableContent: RawCommands['clearTableContent'] =
  (pos) =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('updateTable', { pos })
        )
      }
      return true
    }