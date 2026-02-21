import type { RawCommands } from "@tiptap/core"


declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    styleCell: {
      styleCell: (cellPos: number, styles: Partial<CSSStyleDeclaration>) => ReturnType
    }
  }
}

export const styleCell: RawCommands['styleCell'] =
  (cellPos, styles) =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta('updateCell', {
            pos: cellPos, pendingCommand: {
              action: 'setCellStyle', options: {
                ...styles
              }
            }
          })
        )
      }
      return true
    }