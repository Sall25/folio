import type { RawCommands } from "@tiptap/core"
import { NodeSelection, TextSelection } from "@tiptap/pm/state"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    clearSelection: {
      clearSelection: (pos: number) => ReturnType
    }
  }
}

export const clearSelection: RawCommands['clearSelection'] =
  (pos) =>
    ({ tr, dispatch }) => {

      if (dispatch) {
        const selection = tr.selection
        if (selection instanceof TextSelection) {
          dispatch(
            tr.setSelection(TextSelection.create(
              tr.doc,
              selection.from
            ))
          )
        }
        else if (selection instanceof NodeSelection) {
          dispatch(
            tr.setSelection(NodeSelection.create(
              tr.doc,
              pos
            ))
          )
        }
      }
      return true
    }