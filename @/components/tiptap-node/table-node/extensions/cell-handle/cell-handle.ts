import { selectCell } from "../utils/select-cell";
import { styleSelection } from "../utils/style-selection";
import { Extension } from "@tiptap/core";

export const CellHandle = Extension.create({
  name: "cellHandle",
  addCommands() {
    return {
      ...this.parent?.(),
      selectCell(cellPos) {
        return ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(selectCell(tr, cellPos));
          }
          return true;
        };
      },
      styleCell(_, styles) {
        return ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(styleSelection(tr, styles));
          }
          return true;
        };
      },
    };
  },
});
