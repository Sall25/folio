import type { RawCommands } from "@tiptap/core"
import { TextSelection } from "@tiptap/pm/state"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    insertLineAfter: {
      insertLineAfter: (pos: number) => ReturnType
    }
  }
}

export const insertLineAfter: RawCommands['insertLineAfter'] =
  (pos) =>
    ({ dispatch, tr, state }) => {
      if (dispatch) {

        const node = tr.doc.nodeAt(pos)
        if (!node) return false

        // Position immediately after the node
        const insertPos = pos + node.nodeSize
        const mappedPos = tr.mapping.map(insertPos)

        // Create an empty paragraph (a "new line")
        const paragraph = state.schema.nodes.paragraph.create()

        tr = tr.insert(insertPos, paragraph)

        // Place cursor inside the new paragraph
        tr = tr.setSelection(
          TextSelection.create(tr.doc, tr.doc.resolve(mappedPos + 1).pos)
        )

        tr = tr.insertText('/', mappedPos + 1)

        tr = tr.setSelection(
          TextSelection.create(tr.doc, mappedPos + 2)
        )
        dispatch(tr)
      }
      return true

    }
