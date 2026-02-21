import type { RawCommands } from "@tiptap/core"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setRowStyle: {
      setRowStyle: (rowIndex: number, tablePos: number, styles: Partial<CSSStyleDeclaration>) => ReturnType
    }
  }
}

export const setRowStyle: RawCommands['setRowStyle'] =
  (rowIndex, tablePos, styles) =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('updateRow', {
            rowIndex,
            tablePos,
            pendingCommand: { action: 'setRowStyle', options: styles }
          })
        )
      }
      return true
    }