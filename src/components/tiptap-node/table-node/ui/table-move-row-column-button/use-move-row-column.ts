import type { Editor } from "@tiptap/core";
import { useTableOverlays } from "../table-overlays";
import type { MoveRowColButtonProps } from "./table-move-row-column-button";
import { useTableHasMergedCells } from "../../hooks";

interface UseMoveRowColReturnProps {
  isVisible: boolean;
  rowIndex?: number;
  colIndex?: number;
  editor: Editor | null;
}

export function useMoveRowCol({
  hideWhenUnavailable,
  orientation,
  target,
}: Required<
  Pick<MoveRowColButtonProps, "hideWhenUnavailable" | "orientation" | "target">
>): UseMoveRowColReturnProps {
  const { isLastCol, isLastRow, colIndex, rowIndex, editor } =
    useTableOverlays();
  const merged = useTableHasMergedCells(editor);

  let shouldBeVisible = false;

  if (target === "row") {
    if (orientation === "up") {
      shouldBeVisible = rowIndex !== 0;
    } else if (orientation === "down") {
      shouldBeVisible = !isLastRow;
    }
  } else if (target === "col") {
    if (orientation === "left") {
      shouldBeVisible = colIndex !== 0;
    } else if (orientation === "right") {
      shouldBeVisible = !isLastCol;
    }
  }

  const isVisible = !merged && (hideWhenUnavailable ? shouldBeVisible : true);

  return { isVisible, rowIndex, colIndex, editor };
}
