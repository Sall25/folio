import type { RawCommands } from "@tiptap/core"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    hideCellHandle: {
      hideCellHandle: () => ReturnType
    }
  }
}

export const hideCellHandle: RawCommands['hideCellHandle'] =
  () =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('hideCellHandle', true)
        )
      }
      return true
    }