import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { CellSelection, TableMap } from "@tiptap/pm/tables";

export const cellDecorationPluginKey = new PluginKey("cellDecoration");

export const CellDecorationPlugin = () => {
  return new Plugin({
    key: cellDecorationPluginKey,

    state: {
      init: () => DecorationSet.empty,

      apply(tr, decorations, _oldState, newState) {
        if (!tr.selectionSet && !tr.docChanged) {
          return decorations.map(tr.mapping, tr.doc);
        }

        const { selection } = newState;
        const decos: Decoration[] = [];

        // --- Active/focused single cell ---
        const $anchor = selection.$anchor;
        if ($anchor.depth >= 2) {
          const cellNode = $anchor.node(-1);
          if (
            cellNode &&
            ["tableCell", "tableHeader"].includes(cellNode.type.name)
          ) {
            const cellPos = $anchor.before(-1);
            decos.push(
              Decoration.node(cellPos, cellPos + cellNode.nodeSize, {
                class: "cell-active",
              }),
            );
          }
        }

        // --- Multi-cell selection: decorate each cell with position hints ---
        if (selection instanceof CellSelection) {
          // Gather all selected cells with their positions
          const cells: {
            pos: number;
            node: Parameters<Parameters<CellSelection["forEachCell"]>[0]>[0];
          }[] = [];
          selection.forEachCell((cellNode, cellPos) => {
            cells.push({ pos: cellPos, node: cellNode });
          });

          if (cells.length > 0) {
            // Find bounding row/col indices using the table map
            const $anchorCell = selection.$anchorCell;
            const $headCell = selection.$headCell;
            const table = $anchorCell.node(-1);
            const tableStart = $anchorCell.start(-1);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const map = (selection as any).tableMap ?? TableMap.get(table);

            const anchorRect = map.findCell($anchorCell.pos - tableStart);
            const headRect = map.findCell($headCell.pos - tableStart);

            const minCol = Math.min(anchorRect.left, headRect.left);
            const maxCol = Math.max(anchorRect.right, headRect.right) - 1;
            const minRow = Math.min(anchorRect.top, headRect.top);
            const maxRow = Math.max(anchorRect.bottom, headRect.bottom) - 1;

            cells.forEach(({ pos, node: cellNode }) => {
              const cellRect = map.findCell(pos - tableStart);

              // Determine which edges are on the selection boundary
              const onTop = cellRect.top === minRow;
              const onBottom = cellRect.bottom === maxRow + 1;
              const onLeft = cellRect.left === minCol;
              const onRight = cellRect.right === maxCol + 1;

              const classes = [
                "cell-selected",
                onTop ? "sel-top" : "",
                onBottom ? "sel-bottom" : "",
                onLeft ? "sel-left" : "",
                onRight ? "sel-right" : "",
              ]
                .filter(Boolean)
                .join(" ");

              decos.push(
                Decoration.node(pos, pos + cellNode.nodeSize, {
                  class: classes,
                }),
              );
            });
          }
        }

        return DecorationSet.create(newState.doc, decos);
      },
    },

    props: {
      decorations(state) {
        return cellDecorationPluginKey.getState(state);
      },
    },
  });
};
