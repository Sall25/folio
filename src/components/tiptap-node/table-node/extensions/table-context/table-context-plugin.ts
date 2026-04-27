import { CellSelection } from "prosemirror-tables";
import {
  getCellIndices,
  getEdgeFlags,
  getHeaderCellRect,
  getRowRange,
  getRowRect,
  getRowStart,
  getTableContext,
} from "../utils";
import { Plugin, PluginKey } from "@tiptap/pm/state";

type Col = {
  index: number;
  width: number;
};

type Row = {
  index: number;
  height: number;
};

export const tableContextPluginKey = new PluginKey<{
  currentCol: Col | null;
  currentRow: Row | null;
  colCount: number;
  rowCount: number;
  cols: number[];
  rows: number[];
  columnIndex: number; // Hovered column
  rowIndex: number; // Hovered row
  isLastColumn: boolean; // Show 'Add column' UI
  isLastRow: boolean; // Show 'Add row' UI
  rowStart: number; // PM position to insert row after
  rowEnd: number; // row end position
  headerCellRect: DOMRect | null; // Anchor column menu
  rowRect: DOMRect | null; // Anchor row menu
  parentTableDOM: HTMLElement | null; // Table Measurements,
  lastColumnIndex: number | null;
  lastRowIndex: number | null;
  tablePos: number | null;
  isLocked: boolean;
  cellRect: Record<"left" | "top" | "width" | "height", number> | null;
  cellPos: number;
}>("tablePlugin");

export const TableContextPlugin = () => {
  let locked: boolean;

  return new Plugin({
    key: tableContextPluginKey,

    state: {
      init: () => {
        return {
          currentCol: null,
          currentRow: null,
          colCount: 0,
          rowCount: 0,
          cols: [],
          rows: [],
          columnIndex: -1,
          rowIndex: -1,
          isLastColumn: false,
          isLastRow: false,
          rowStart: -1,
          rowEnd: -1,
          headerCellRect: null,
          rowRect: null,
          parentTableDOM: null,
          lastColumnIndex: null,
          lastRowIndex: null,
          tablePos: null,
          isLocked: false,
          cellRect: null,
          cellPos: -1,
        };
      },

      apply: (tr, value) => {
        const lockMeta = tr.getMeta("lockTableHandle");

        // Only update locked if the meta was explicitly set
        if (lockMeta === true) {
          locked = true;
        }
        if (lockMeta === false) {
          locked = false;
        }

        const meta = tr.getMeta(tableContextPluginKey);

        return meta
          ? { ...meta, isLocked: locked }
          : { ...value, isLocked: locked };
      },
    },
    view() {
      return {
        update(view, prevState) {
          if (locked) return;
          if (view.state.selection.eq(prevState.selection)) return;

          const { selection } = view.state;
          const meta = tableContextPluginKey.getState(view.state);

          const $cell =
            selection instanceof CellSelection
              ? selection.$anchorCell
              : selection.$anchor;

          const { $anchor } = selection;
          // Walk up the depth to find a cell — don't assume -1 is always the cell
          let isInTable = false;
          for (let d = $anchor.depth; d >= 1; d--) {
            const node = $anchor.node(d);
            if (["tableCell", "tableHeader"].includes(node.type.name)) {
              isInTable = true;
              break;
            }
          }

          if (!isInTable) {
            view.dispatch(
              view.state.tr.setMeta(tableContextPluginKey, {
                ...meta,
                cellPos: -1,
                cellRect: null,
              }),
            );
            return;
          }

          if ($cell.depth < 2) return;

          const cellNode = $cell.node(-1);
          if (
            !cellNode ||
            !["tableCell", "tableHeader"].includes(cellNode.type.name)
          )
            return;

          const cellPos = $cell.before(-1);

          // Defer rect calculation until after browser paint
          requestAnimationFrame(() => {
            const cellDOM = view.nodeDOM(cellPos) as HTMLElement | null;
            if (!cellDOM || !meta?.parentTableDOM) return;

            const cellBox = cellDOM.getBoundingClientRect();
            const tableBox = meta.parentTableDOM.getBoundingClientRect();

            view.dispatch(
              view.state.tr.setMeta(tableContextPluginKey, {
                ...meta,
                cellPos,
                cellRect: {
                  top: cellBox.top - tableBox.top,
                  left: cellBox.left - tableBox.left,
                  width: cellBox.width,
                  height: cellBox.height,
                },
              }),
            );
          });
        },
        // update(view, prevState) {
        //   if (locked) return;
        //   if (view.state.selection.eq(prevState.selection)) return;

        //   const { selection } = view.state;

        //   const meta = tableContextPluginKey.getState(view.state);

        //   // Resolve the target cell — head cell for CellSelection, anchor for regular
        //   const $cell =
        //     selection instanceof CellSelection
        //       ? selection.$headCell
        //       : selection.$anchor;

        //   // Guard: make sure we're deep enough to have a cell parent
        //   if ($cell.depth < 2) return;

        //   // Guard: make sure the parent is actually a table cell
        //   const cellNode = $cell.node(-1);
        //   if (
        //     !cellNode ||
        //     !["tableCell", "tableHeader"].includes(cellNode.type.name)
        //   )
        //     return;

        //   const cellPos = $cell.before(-1);
        //   const cellDOM = view.nodeDOM(cellPos) as HTMLElement | null;

        //   if (!cellDOM || !meta?.parentTableDOM) return;

        //   const cellBox = cellDOM.getBoundingClientRect();
        //   const tableBox = meta.parentTableDOM.getBoundingClientRect();

        //   const cellRect = {
        //     top: cellBox.top - tableBox.top,
        //     left: cellBox.left - tableBox.left,
        //     width: cellBox.width,
        //     height: cellBox.height,
        //   };

        //   view.dispatch(
        //     view.state.tr.setMeta(tableContextPluginKey, {
        //       ...meta,
        //       cellPos,
        //       cellRect,
        //     }),
        //   );
        // },
      };
    },
    props: {
      handleDOMEvents: {
        // inside props.handleDOMEvents
        mousemove(view, event) {
          if (locked) return false;

          const meta = tableContextPluginKey.getState(view.state);

          // During cell selection drag — update cellRect to follow the head cell
          if (view.state.selection instanceof CellSelection) {
            const pos = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            if (!pos) return false;

            const $pos = view.state.doc.resolve(pos.pos);
            if ($pos.depth < 2) return false;

            const cellNode = $pos.node(-1);
            if (
              !cellNode ||
              !["tableCell", "tableHeader"].includes(cellNode.type.name)
            )
              return false;

            const cellPos = $pos.before(-1);
            if (cellPos === meta?.cellPos) return false; // no change

            const cellDOM = view.nodeDOM(cellPos) as HTMLElement | null;
            if (cellDOM && meta?.parentTableDOM) {
              const cellBox = cellDOM.getBoundingClientRect();
              const tableBox = meta.parentTableDOM.getBoundingClientRect();

              view.dispatch(
                view.state.tr.setMeta(tableContextPluginKey, {
                  ...meta,
                  cellPos,
                  cellRect: {
                    top: cellBox.top - tableBox.top,
                    left: cellBox.left - tableBox.left,
                    width: cellBox.width,
                    height: cellBox.height,
                  },
                }),
              );
            }
            return false;
          }

          const ctx = getTableContext(view, event);
          if (!ctx) {
            return false;
          }

          const { cell, table } = ctx;
          const tableContainer = view.nodeDOM(table.pos) as HTMLElement | null;
          if (!tableContainer) return false;

          const actualTable = tableContainer.querySelector("table");

          if (!actualTable) return false;

          const parentTableDOM = actualTable;

          const { map, columnIndex, rowIndex } = getCellIndices(
            table.node,
            cell.pos,
            table.pos,
          );

          // Perf guard

          if (meta?.columnIndex === columnIndex && meta.rowIndex === rowIndex) {
            return false;
          }

          // Guard against stale indices after structural changes
          if (columnIndex >= map.width || rowIndex >= map.height) return false;

          const { isLastColumn, isLastRow } = getEdgeFlags(
            map,
            columnIndex,
            rowIndex,
          );

          const rowStart = getRowStart(table.node, table.pos, rowIndex);

          const headerCellRect = getHeaderCellRect(
            view,
            table.node,
            table.pos,
            columnIndex,
          );

          const rowRect = getRowRect(view, rowStart);

          const { rowEnd } = getRowRange(table.pos, table.node, rowIndex);

          const tablePos = table.pos;

          const cols = [];
          const rows = [];

          for (let col = 0; col < map.width; col++) {
            const rect = getHeaderCellRect(view, table.node, table.pos, col);
            if (!rect) continue;

            cols.push(rect.width);
          }
          for (let row = 0; row < map.height; row++) {
            const start = getRowStart(table.node, table.pos, row);
            const rect = getRowRect(view, start);
            if (!rect) continue;

            rows.push(rect.height);
          }

          const currentCol = {
            index: columnIndex,
            width: headerCellRect?.width ?? 0,
          };
          const currentRow = {
            index: rowIndex,
            height: rowRect?.height ?? 0,
          };

          const colCount = map.width;
          const rowCount = map.height;

          view.dispatch(
            view.state.tr.setMeta(tableContextPluginKey, {
              ...meta,
              currentCol,
              currentRow,
              colCount,
              rowCount,
              cols,
              rows,
              parentTableDOM,
              columnIndex,
              rowIndex,
              lastColumnIndex: columnIndex,
              lastRowIndex: rowIndex,
              isLastColumn,
              isLastRow,
              rowStart,
              rowEnd,
              headerCellRect,
              rowRect,
              tablePos,
            }),
          );

          return false;
        },
      },
    },
  });
};
