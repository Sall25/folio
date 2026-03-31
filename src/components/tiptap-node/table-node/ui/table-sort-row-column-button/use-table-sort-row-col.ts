import { useEditorState } from "@tiptap/react";
import { TableMap } from "@tiptap/pm/tables";
import { useTableOverlays } from "../table-overlays";
import { tableContextPluginKey } from "../../extensions/table-context";
import { useIsRowColEmpty } from "../../hooks";

interface UseTableSortRowColProps {
  target: "row" | "col";
  hideWhenUnavailable?: boolean;
}

interface UseTableSortRowColReturn {
  isVisible: boolean;
}

export function useTableSortRowCol({
  target,
  hideWhenUnavailable = false,
}: UseTableSortRowColProps): UseTableSortRowColReturn {
  const { editor, colIndex, rowIndex } = useTableOverlays();

  // const isEmpty = useEditorState({
  //   editor,
  //   selector: (ctx) => {
  //     if (
  //       !ctx ||
  //       !ctx.editor ||
  //       colIndex === undefined ||
  //       rowIndex === undefined
  //     )
  //       return false;
  //     const pluginState = tableContextPluginKey.getState(ctx.editor.state);
  //     if (!pluginState?.tablePos) return true;

  //     const { tablePos } = pluginState;
  //     const tableNode = ctx.editor.state.doc.nodeAt(tablePos);
  //     if (!tableNode) return true;

  //     const map = TableMap.get(tableNode);

  //     if (target === "row") {
  //       for (let col = 0; col < map.width; col++) {
  //         const cellIndex = map.map[rowIndex * map.width + col];
  //         const cellNode = tableNode.nodeAt(cellIndex);
  //         if (cellNode && cellNode.textContent.trim().length > 0) return false;
  //       }
  //     } else {
  //       for (let row = 0; row < map.height; row++) {
  //         const cellIndex = map.map[row * map.width + colIndex];
  //         const cellNode = tableNode.nodeAt(cellIndex);
  //         if (cellNode && cellNode.textContent.trim().length > 0) return false;
  //       }
  //     }

  //     return true;
  //   },
  // });

  const isEmpty = useIsRowColEmpty(editor!, target, rowIndex!, colIndex!);

  return {
    isVisible: hideWhenUnavailable ? !isEmpty : true,
  };
}
