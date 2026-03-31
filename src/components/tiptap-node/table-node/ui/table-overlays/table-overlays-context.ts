import type { Editor } from "@tiptap/core";
import { createContext } from "react";

interface TableOverlaysContextType {
  editor: Editor | null;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  tableWidth?: number;
  tableHeight?: number;
  isLastCol?: boolean;
  isLastRow?: boolean;
  rowIndex?: number;
  colIndex?: number;
  cellRect?: Record<"left" | "right" | "width" | "height", number>;
  cellPos?: number;
}

export const TableOverlaysContext = createContext<TableOverlaysContextType>({
  editor: null,
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  tableWidth: 0,
  tableHeight: 0,
  isLastCol: false,
  isLastRow: false,
});
