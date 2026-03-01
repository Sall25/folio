import type { RawCommands } from "@tiptap/core";

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    decorateSelection: {
      decorateSelection: (from: number, to: number) => ReturnType
    }
  }
}


export const decorateSelection: RawCommands['decorateSelection'] =
  (from, to) =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('decorateSelection', { from, to })
        )
      }
      return true
    }