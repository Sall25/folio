// useIsRowColEmpty.ts
import { useEditorState } from "@tiptap/react";
import { TableMap } from "@tiptap/pm/tables";
import type { Editor } from "@tiptap/core";
import { tableContextPluginKey } from "../extensions/table-context";

export function useIsRowColEmpty(
  editor: Editor,
  target: "row" | "col",
  rowIndex: number,
  colIndex: number,
): boolean {
  return useEditorState({
    editor,
    selector: (ctx) => {
      const pluginState = tableContextPluginKey.getState(ctx.editor.state);
      if (!pluginState?.tablePos) return true;

      const { tablePos } = pluginState;

      const $pos = ctx.editor.state.doc.resolve(tablePos);
      // nodeAfter at this position is the table node (child of tableWrapper)
      const tableNode = $pos.nodeAfter ?? ctx.editor.state.doc.nodeAt(tablePos);

      // Add this temporarily
      console.log(
        "tableNode type:",
        tableNode?.type.name,
        "| tableRole:",
        tableNode?.type.spec.tableRole,
      );

      if (!tableNode || tableNode.type.spec.tableRole !== "table") return true; // guard
      if (!tableNode) return true;

      const map = TableMap.get(tableNode);

      if (rowIndex >= map.height || colIndex >= map.width) return true;

      if (target === "row") {
        for (let col = 0; col < map.width; col++) {
          const cellIndex = map.map[rowIndex * map.width + col];
          const cellNode = tableNode.nodeAt(cellIndex);
          if (cellNode && cellNode.textContent.trim().length > 0) return false;
        }
      } else {
        for (let row = 0; row < map.height; row++) {
          const cellIndex = map.map[row * map.width + colIndex];
          const cellNode = tableNode.nodeAt(cellIndex);
          if (cellNode && cellNode.textContent.trim().length > 0) return false;
        }
      }

      return true;
    },
  });
}
