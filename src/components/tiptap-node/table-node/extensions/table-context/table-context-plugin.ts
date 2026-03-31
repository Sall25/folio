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

          // Resolve the target cell — head cell for CellSelection, anchor for regular
          const $cell =
            selection instanceof CellSelection
              ? selection.$headCell
              : selection.$anchor;

          // Guard: make sure we're deep enough to have a cell parent
          if ($cell.depth < 2) return;

          // Guard: make sure the parent is actually a table cell
          const cellNode = $cell.node(-1);
          if (
            !cellNode ||
            !["tableCell", "tableHeader"].includes(cellNode.type.name)
          )
            return;

          const cellPos = $cell.before(-1);
          const cellDOM = view.nodeDOM(cellPos) as HTMLElement | null;

          if (!cellDOM || !meta?.parentTableDOM) return;

          const cellBox = cellDOM.getBoundingClientRect();
          const tableBox = meta.parentTableDOM.getBoundingClientRect();

          const cellRect = {
            top: cellBox.top - tableBox.top,
            left: cellBox.left - tableBox.left,
            width: cellBox.width,
            height: cellBox.height,
          };

          view.dispatch(
            view.state.tr.setMeta(tableContextPluginKey, {
              ...meta,
              cellPos,
              cellRect,
            }),
          );
        },
        // update(view, prevState) {
        //   if (locked) return;

        //   if (view.state.selection.eq(prevState.selection)) return;

        //   const { $anchor } = view.state.selection;

        //   // Guard: make sure we're deep enough to have a cell parent
        //   if ($anchor.depth < 2) return;

        //   // Guard: make sure the parent is actually a table cell
        //   const cellNode = $anchor.node(-1);
        //   if (
        //     !cellNode ||
        //     !["tableCell", "tableHeader"].includes(cellNode.type.name)
        //   )
        //     return;

        //   const cellPos = $anchor.before(-1);

        //   const cellDOM = view.nodeDOM(cellPos) as HTMLElement | null;
        //   const meta = tableContextPluginKey.getState(view.state);

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

          // Don't overwrite cell position during cell selection/drag
          if (view.state.selection instanceof CellSelection) return false;

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
          const meta = tableContextPluginKey.getState(view.state);
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

          const prevRect = tableContextPluginKey.getState(view.state)?.cellRect;
          const prevPos = tableContextPluginKey.getState(view.state)?.cellPos;
          let cellRect = prevRect;
          let cellPos = prevPos;
          // initialize cellRect / cellPos
          if (!prevRect || prevPos === -1) {
            const cellDOM = view.nodeDOM(cell.pos) as HTMLElement | null;
            if (!cellDOM) return false;
            const cellBox = cellDOM.getBoundingClientRect();
            const tableBox = parentTableDOM.getBoundingClientRect();

            cellRect = {
              top: cellBox.top - tableBox.top,
              left: cellBox.left - tableBox.left,
              width: cellBox.width,
              height: cellBox.height,
            };
            cellPos = cell.pos;
          }

          view.dispatch(
            view.state.tr.setMeta(tableContextPluginKey, {
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
              cellPos,
              cellRect,
              //  cellPos: cell.pos,
              //    cellRect,
            }),
          );

          return false;
        },
      },
    },
  });
};
