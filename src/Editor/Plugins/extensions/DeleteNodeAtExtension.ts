import { Extension } from "@tiptap/react"

export const DeleteNodeAtExtension = Extension.create({
  name: 'deleteNodeAt',

  addCommands() {
    return {
      deleteNodeAt(pos) {
        return ({ state, dispatch }) => {


          const node = state.doc.nodeAt(pos);
          if (!node) return false;

          const tr = state.tr.delete(pos, pos + node.nodeSize);

          if (dispatch) dispatch(tr.scrollIntoView());
          return true;
        }
      },
    }
  },
})