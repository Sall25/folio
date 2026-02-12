import { Extension } from "@tiptap/react"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    duplicateNode: {
      duplicateNode: (pos: number) => ReturnType
    }
  }
}

export const DuplicateNodeExtension = Extension.create({
  name: 'duplicateNodeExtension',
  addCommands() {
    return {
      duplicateNode(pos) {
        return ({ state, dispatch }) => {

          const node = state.doc.nodeAt(pos);
          if (!node) return false;

          const tr = state.tr;

          //  Important: create a NEW node instance (immutability!)
          const copy = node.type.create(node.attrs, node.content, node.marks);

          tr.insert(pos + node.nodeSize, copy);

          // Optional: place cursor inside duplicated node
          // tr.setSelection(
          //   state.selection.constructor.near(tr.doc.resolve(pos + node.nodeSize))
          // );

          if (dispatch) dispatch(tr.scrollIntoView());
          return true;

        }
      },
    }
  },
})
