import type { RawCommands } from "@tiptap/core"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setColumnStyle: {
      setColumnStyle: (columnIndex: number, tablePos: number, styles: Partial<CSSStyleDeclaration>) => ReturnType
    }
  }
}

export const setColumnStyle: RawCommands['setColumnStyle'] =
  (columnIndex, tablePos, styles) =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('updateColumn', {
            columnIndex,
            tablePos,
            pendingCommand: { action: 'setColumnStyle', options: styles }
          })
        )
      }
      return true
    }
