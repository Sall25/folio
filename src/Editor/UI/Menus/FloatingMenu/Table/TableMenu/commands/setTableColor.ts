import type { RawCommands } from "@tiptap/core"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setTableColor: {
      setTableColor: (pos: number, color: string, target: 'text' | 'highlight') => ReturnType
    }
  }
}

export const setTableColor: RawCommands['setTableColor'] =
  (pos, color, target) =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('updateTable', { pos, color, target })
        )
      }
      return true
    }