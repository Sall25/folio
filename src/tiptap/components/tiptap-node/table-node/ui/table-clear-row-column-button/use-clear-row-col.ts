import { useIsRowColEmpty } from "../../hooks";
import { useTableOverlays } from "../table-overlays";

interface UseClearRowColProps {
  target: "row" | "col";
  hideWhenUnavailable: boolean;
}

export function UseClearRowCol({
  target,
  hideWhenUnavailable,
}: UseClearRowColProps) {
  const { colIndex, rowIndex, editor } = useTableOverlays();

  const isEmpty = useIsRowColEmpty(editor!, target, rowIndex!, colIndex!);

  const clear = () => {
    editor!.commands.clearAllContents();
  };

  const isVisible = hideWhenUnavailable ? !isEmpty : true;

  return {
    isVisible,
    clear,
  };
}
