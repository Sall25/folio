import { useContext } from "react";
import { TableOverlaysContext } from "./table-overlays-context";
import { useEditorState } from "@tiptap/react";
import { tableContextPluginKey } from "../../extensions/table-context";

export function useTableOverlays() {
  const ctx = useContext(TableOverlaysContext);
  const { editor } = ctx;

  const { rowIndex, colIndex, cellRect, cellPos } = useEditorState({
    editor: editor!,
    selector: (s) => ({
      rowIndex: tableContextPluginKey.getState(s.editor.state)?.rowIndex ?? -1,
      colIndex:
        tableContextPluginKey.getState(s.editor.state)?.columnIndex ?? -1,
      cellPos: tableContextPluginKey.getState(s.editor.state)?.cellPos,
      cellRect: tableContextPluginKey.getState(s.editor.state)?.cellRect,
    }),
  });

  return { ...ctx, rowIndex, colIndex, cellPos, cellRect };
}
