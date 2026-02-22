import type { RawCommands } from "@tiptap/core"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    styleTable: {
      styleTable: (pos: number, styles: Partial<CSSStyleDeclaration>) => ReturnType
    }
  }
}

export const styleTable: RawCommands['styleTable'] =
  (pos, styles) =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('updateTable', { pos, styles })
        )
      }
      return true
    }