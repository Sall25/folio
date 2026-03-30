import { TableMap } from "prosemirror-tables";
import { useTableOverlays } from "../table-overlays";
import { useEditorState } from "@tiptap/react";

interface UseToggleHeaderRowColProps {
  target: "row" | "col";
  hideWhenUnavailable?: boolean;
}

interface UseToggleHeaderRowColReturn {
  isVisible: boolean;
  isActive: boolean;
  toggle: () => void;
}

export function useToggleHeaderRowCol({
  target,
  hideWhenUnavailable = false,
}: UseToggleHeaderRowColProps): UseToggleHeaderRowColReturn {
  const { editor, colIndex, rowIndex } = useTableOverlays();

  const result = useEditorState({
    editor,

    selector: (ctx) => {
      const { editor: e } = ctx;
      if (!e)
        return {
          canToggleRow: false,
          canToggleCol: false,
          isRowHeader: false,
          isColHeader: false,
        };

      const { state } = e;
      const { selection } = state;
      const $pos = selection.$anchor;

      // Find the table node and its position
      let tableStart = -1;
      let tableNode = null;
      for (let d = $pos.depth; d > 0; d--) {
        if ($pos.node(d).type.name === "table") {
          tableNode = $pos.node(d);
          tableStart = $pos.start(d);
          break;
        }
      }

      let isRowHeader = false;
      let isColHeader = false;

      if (tableNode && tableStart !== -1) {
        const map = TableMap.get(tableNode);
        const cellPos = $pos.before($pos.depth); // position of current cell
        const cellIndex = map.map.indexOf(cellPos - tableStart);

        if (cellIndex !== -1) {
          const row = Math.floor(cellIndex / map.width);
          const col = cellIndex % map.width;

          // Row is a header row if all cells in row 0 are tableHeader
          isRowHeader =
            row === 0 &&
            map.map.slice(0, map.width).every((pos) => {
              const node = tableNode.nodeAt(pos);
              return node?.type.name === "tableHeader";
            });

          // Col is a header col if all cells in col 0 are tableHeader
          isColHeader =
            col === 0 &&
            Array.from(
              { length: map.height },
              (_, r) => map.map[r * map.width],
            ).every((pos) => {
              const node = tableNode.nodeAt(pos);
              return node?.type.name === "tableHeader";
            });
        }
      }

      return {
        canToggleRow: (e.can().toggleHeaderRow() && rowIndex === 0) ?? false,
        canToggleCol: (e.can().toggleHeaderColumn() && colIndex === 0) ?? false,
        isRowHeader,
        isColHeader,
      };
    },
  });

  if (!result) {
    return {
      isVisible: false,
      isActive: false,
      toggle: () => {},
    };
  }

  const { canToggleRow, canToggleCol, isRowHeader, isColHeader } = result;

  const canToggle = target === "row" ? canToggleRow : canToggleCol;
  const isActive = target === "row" ? isRowHeader : isColHeader;

  const isVisible = hideWhenUnavailable ? canToggle : true;

  const toggle = () => {
    if (target === "row") {
      editor?.chain().focus().toggleHeaderRow().run();
    } else {
      editor?.chain().focus().toggleHeaderColumn().run();
    }
  };

  return {
    isVisible,
    isActive,
    toggle,
  };
}
