import { Button } from "src/components/tiptap-ui-primitive/button";
import { useTableDuplicateRowCol } from "./use-table-duplicate-row-col";
import { DuplicateIcon } from "src/components/tiptap-icons/duplicate-icon";

interface TableDuplicateRowColButtonProps {
  target?: "row" | "col";
  text?: string;
  hideWhenUnavailable?: boolean;
  onAction?: () => void;
  className?: string;
}

export function TableDuplicateRowColButton({
  target = "row",
  hideWhenUnavailable = false,
  text,
  onAction,
  className,
}: TableDuplicateRowColButtonProps) {
  const { isVisible, duplicate } = useTableDuplicateRowCol({
    target,
    hideWhenUnavailable,
  });

  if (!isVisible) return null;

  return (
    <Button
      variant="ghost"
      tabIndex={-1}
      onClick={() => {
        duplicate();
        onAction?.();
      }}
      className={className}
    >
      <DuplicateIcon className="tiptap-button-icon" />
      {text && <span>{text}</span>}
    </Button>
  );
}
