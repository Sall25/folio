import { useEffect, useState } from "react";
import { Editor } from "@tiptap/core";
import type { ReactNode } from "react";
import { TableOverlaysContext } from "./table-overlays-context";
import { tableContextPluginKey } from "../../extensions/table-context";

export function TableOverlaysProvider({
  children,
  editor,
}: {
  children: ReactNode;
  editor: Editor | null;
}) {
  const getPluginState = () => tableContextPluginKey.getState(editor!.state);

  const [left, setLeft] = useState(() => {
    const s = getPluginState();
    const cols = s?.cols ?? [];
    return cols
      .slice(0, s?.currentCol?.index ?? 0)
      .reduce((sum, w) => sum + w, 0);
  });

  const [top, setTop] = useState(() => {
    const s = getPluginState();
    const rows = s?.rows ?? [];
    return rows
      .slice(0, s?.currentRow?.index ?? 0)
      .reduce((sum, h) => sum + h, 0);
  });

  const [width, setWidth] = useState(
    () => getPluginState()?.currentCol?.width ?? 0,
  );

  const [height, setHeight] = useState(
    () => getPluginState()?.currentRow?.height ?? 0,
  );

  const [tableWidth, setTableWidth] = useState(() => {
    const cols = getPluginState()?.cols ?? [];
    return cols.reduce((sum, w) => sum + w, 0);
  });

  const [tableHeight, setTableHeight] = useState(() => {
    const rows = getPluginState()?.rows ?? [];
    return rows.reduce((sum, h) => sum + h, 0);
  });

  const [isLastRow, setIsLastRow] = useState(
    () => getPluginState()?.isLastRow ?? false,
  );

  const [isLastCol, setIsLastCol] = useState(
    () => getPluginState()?.isLastColumn ?? false,
  );

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const pluginState = tableContextPluginKey.getState(editor.state);

      // Don't update if we're not hovering a table
      if (!pluginState?.parentTableDOM || pluginState.columnIndex === -1) {
        return;
      }
      const colWidths =
        tableContextPluginKey.getState(editor.state)?.cols ?? [];
      const rowHeights =
        tableContextPluginKey.getState(editor.state)?.rows ?? [];

      const currentRow = tableContextPluginKey.getState(
        editor.state,
      )?.currentRow;
      const currentCol = tableContextPluginKey.getState(
        editor.state,
      )?.currentCol;
      const overLastCol = tableContextPluginKey.getState(
        editor.state,
      )?.isLastColumn;
      const overLastRow = tableContextPluginKey.getState(
        editor.state,
      )?.isLastRow;

      setTop(
        rowHeights
          .slice(0, currentRow?.index ?? 0)
          .reduce((sum: number, h: number) => sum + h, 0),
      );
      setLeft(
        colWidths
          .slice(0, currentCol?.index ?? 0)
          .reduce((sum: number, w: number) => sum + w, 0),
      );

      setTableWidth(colWidths.reduce((sum: number, w: number) => sum + w, 0));
      setTableHeight(rowHeights.reduce((sum: number, h: number) => sum + h, 0));
      setWidth(currentCol?.width ?? 0);
      setHeight(currentRow?.height ?? 0);
      setIsLastCol(overLastCol ?? false);
      setIsLastRow(overLastRow ?? false);
    };

    editor.on("transaction", update);
    return () => {
      editor.off("transaction", update);
    };
  }, [editor]);

  return (
    <TableOverlaysContext.Provider
      value={{
        editor,
        left,
        top,
        width,
        height,
        tableWidth,
        tableHeight,
        isLastCol,
        isLastRow,
      }}
    >
      {children}
    </TableOverlaysContext.Provider>
  );
}
