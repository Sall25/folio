import { Table } from "@tiptap/extension-table";
import {
  moveColumn,
  moveRow,
  selectColumn as selectColumnTr,
  selectRow as selectRowTr,
  sortColumn as sortColumnFn,
  sortRow as sortRowFn,
} from "../utils";
import {
  TableContextPlugin,
  tableContextPluginKey,
} from "./table-context-plugin";
import { TableMap } from "prosemirror-tables";
import { TextSelection } from "@tiptap/pm/state";
import { CellDecorationPlugin } from "./cell-decoration-plugin";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableExtended: {
      lockTableHandle: () => ReturnType;
      unlockTableHandle: () => ReturnType;
      moveRowUp: (rowIndex: number) => ReturnType;
      moveRowDown: (rowIndex: number) => ReturnType;
      moveColLeft: (colIndex: number) => ReturnType;
      moveColRight: (colIndex: number) => ReturnType;
      sortColumn: (
        colIndex: number,
        tablePos: number,
        ord: "asc" | "desc",
        hasHeader?: boolean,
      ) => ReturnType;
      sortRow: (
        rowIndex: number,
        tablePos: number,
        ord: "asc" | "desc",
      ) => ReturnType;
      addColumnAtEnd: () => ReturnType;
      addRowAtEnd: () => ReturnType;
      duplicateRow: () => ReturnType;
      duplicateColumn: () => ReturnType;
      deleteRowAtIndex: () => ReturnType;
      deleteColAtIndex: () => ReturnType;
    };
  }
}

export const TableContextExtension = Table.extend({
  draggable: false,
  addCommands() {
    return {
      ...this.parent?.(),
      selectColumn(columnIndex, tablePos) {
        return ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(selectColumnTr(tr, tablePos, columnIndex));
          }
          return true;
        };
      },
      selectRow(rowIndex, tablePos) {
        return ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(selectRowTr(tr, rowIndex, tablePos));
          }
          return true;
        };
      },
      lockTableHandle() {
        return ({ tr, dispatch }) => {
          if (dispatch) {
            /**  lockTableHandle */
            dispatch(tr.setMeta("lockTableHandle", true));
            console.log("should lock");
          }
          return true;
        };
      },
      unlockTableHandle() {
        return ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(tr.setMeta("lockTableHandle", false));
          }
          return true;
        };
      },
      moveRowUp(rowIndex) {
        return ({ state, dispatch }) => {
          const tr = moveRow(state.tr, rowIndex, rowIndex - 1);
          if (dispatch) dispatch(tr);
          return true;
        };
      },
      moveRowDown(rowIndex) {
        return ({ state, dispatch }) => {
          const tr = moveRow(state.tr, rowIndex, rowIndex + 1);
          if (dispatch) dispatch(tr);
          return true;
        };
      },
      moveColLeft:
        (colIndex) =>
        ({ state, dispatch }) => {
          const tr = moveColumn(state.tr, colIndex, colIndex - 1);
          if (dispatch) dispatch(tr);
          return true;
        },
      moveColRight:
        (colIndex) =>
        ({ state, dispatch }) => {
          const tr = moveColumn(state.tr, colIndex, colIndex + 1);
          if (dispatch) dispatch(tr);
          return true;
        },
      sortColumn:
        (colIndex, tablePos, ord, hasHeader = true) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(sortColumnFn(tr, tablePos, colIndex, ord, hasHeader));
          }
          return true;
        },
      sortRow:
        (rowIndex, tablePos, ord) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(sortRowFn(tr, rowIndex, tablePos, ord));
          }
          return true;
        },
      addColumnAtEnd:
        () =>
        ({ state, chain }) => {
          const pluginState = tableContextPluginKey.getState(state);
          if (!pluginState?.tablePos) return false;

          const { tablePos } = pluginState;
          const tableNode = state.doc.nodeAt(tablePos);
          if (!tableNode) return false;

          const map = TableMap.get(tableNode);
          if (!map.width) return false;

          // Get the last cell in the first row
          const lastCellIndex = map.map[map.width - 1];
          const lastCellPos = tablePos + lastCellIndex + 1;

          return chain()
            .command(({ tr }) => {
              tr.setSelection(
                TextSelection.near(state.doc.resolve(lastCellPos)),
              );
              return true;
            })
            .addColumnAfter()
            .run();
        },
      addRowAtEnd:
        () =>
        ({ state, chain }) => {
          const pluginState = tableContextPluginKey.getState(state);
          if (!pluginState?.tablePos) return false;

          const { tablePos } = pluginState;
          const tableNode = state.doc.nodeAt(tablePos);
          if (!tableNode) return false;

          const map = TableMap.get(tableNode);
          if (!map.height) return false;

          // Get the last cell in the last row
          const lastCellIndex = map.map[map.width * map.height - 1];
          const lastCellPos = tablePos + lastCellIndex + 1;

          return chain()
            .command(({ tr }) => {
              tr.setSelection(
                TextSelection.near(state.doc.resolve(lastCellPos)),
              );
              return true;
            })
            .addRowAfter()
            .run();
        },
      duplicateRow:
        () =>
        ({ state, dispatch }) => {
          const pluginState = tableContextPluginKey.getState(state);
          if (!pluginState?.tablePos) return false;

          const { tablePos, rowIndex, rowEnd } = pluginState;
          const tableNode = state.doc.nodeAt(tablePos);
          if (!tableNode) return false;

          const map = TableMap.get(tableNode);
          const rowNode = tableNode.child(rowIndex);

          // Collect deep copies of all cells in the row
          const cells = [];
          for (let col = 0; col < map.width; col++) {
            const cellIndex = map.map[rowIndex * map.width + col];
            const cellNode = tableNode.nodeAt(cellIndex);
            if (!cellNode) return false;
            cells.push(cellNode.copy(cellNode.content));
          }

          // Create a new row directly from the row node's own type
          const newRow = rowNode.type.create(
            rowNode.attrs,
            cells,
            rowNode.marks,
          );

          if (dispatch) {
            dispatch(state.tr.insert(rowEnd, newRow));
          }

          return true;
        },
      duplicateColumn:
        () =>
        ({ state, dispatch }) => {
          const pluginState = tableContextPluginKey.getState(state);
          if (!pluginState?.tablePos) return false;

          const { tablePos, columnIndex } = pluginState;
          const tableNode = state.doc.nodeAt(tablePos);
          if (!tableNode) return false;

          const map = TableMap.get(tableNode);

          if (dispatch) {
            const tr = state.tr;

            // Walk rows in reverse to keep positions valid
            for (let row = map.height - 1; row >= 0; row--) {
              const cellIndex = map.map[row * map.width + columnIndex];
              const cellNode = tableNode.nodeAt(cellIndex);
              if (!cellNode) return false;

              // Create a fresh copy using the cell's own type
              const newCell = cellNode.type.create(
                cellNode.attrs,
                cellNode.content,
                cellNode.marks,
              );

              // Insert right after the current cell
              const cellPos = tablePos + cellIndex + 1;
              const cellEnd = cellPos + cellNode.nodeSize - 1;
              tr.insert(cellEnd, newCell);
            }

            dispatch(tr);
          }

          return true;
        },
      deleteRowAtIndex:
        () =>
        ({ state, chain }) => {
          const pluginState = tableContextPluginKey.getState(state);
          if (!pluginState?.tablePos) return false;

          const { tablePos, rowIndex } = pluginState;
          const tableNode = state.doc.nodeAt(tablePos);
          if (!tableNode) return false;

          const map = TableMap.get(tableNode);

          // Can't delete the only remaining row
          if (map.height === 1) return false;

          // Move selection to the target row's first cell then delete
          const cellIndex = map.map[rowIndex * map.width];
          const cellPos = tablePos + cellIndex + 1;

          return chain()
            .command(({ tr }) => {
              tr.setSelection(TextSelection.near(state.doc.resolve(cellPos)));
              return true;
            })
            .deleteRow()
            .run();
        },
      deleteColAtIndex:
        () =>
        ({ state, chain }) => {
          const pluginState = tableContextPluginKey.getState(state);
          if (!pluginState?.tablePos) return false;

          const { tablePos, columnIndex } = pluginState;
          const tableNode = state.doc.nodeAt(tablePos);
          if (!tableNode) return false;

          const map = TableMap.get(tableNode);

          // Can't delete the only remaining column
          if (map.width === 1) return false;

          // Move selection to the target column's first cell then delete
          const cellIndex = map.map[columnIndex];
          const cellPos = tablePos + cellIndex + 1;

          return chain()
            .command(({ tr }) => {
              tr.setSelection(TextSelection.near(state.doc.resolve(cellPos)));
              return true;
            })
            .deleteColumn()
            .run();
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() ?? []),
      TableContextPlugin(),
      CellDecorationPlugin(),
    ];
  },
});
