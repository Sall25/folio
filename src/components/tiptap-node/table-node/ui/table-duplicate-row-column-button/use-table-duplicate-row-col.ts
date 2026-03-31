import { useTableOverlays } from "../table-overlays";
import { useIsRowColEmpty } from "../../hooks";

interface UseTableDuplicateRowColProps {
  target: "row" | "col";
  hideWhenUnavailable?: boolean;
}

interface UseTableDuplicateRowColReturn {
  isVisible: boolean;
  duplicate: () => void;
}

export function useTableDuplicateRowCol({
  target,
  hideWhenUnavailable = false,
}: UseTableDuplicateRowColProps): UseTableDuplicateRowColReturn {
  const { editor, colIndex, rowIndex } = useTableOverlays();

  const isEmpty = useIsRowColEmpty(editor!, target, rowIndex!, colIndex!);

  const isVisible = hideWhenUnavailable ? !isEmpty : true;

  const duplicate = () => {
    if (target === "row") {
      editor?.chain().focus().duplicateRow().run();
    } else {
      editor?.chain().focus().duplicateColumn().run();
    }
  };

  return { isVisible, duplicate };
}
