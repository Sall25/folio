import { InsertLeftIcon } from "src/components/tiptap-icons/insert-left-icon";
import { InsertRightIcon } from "src/components/tiptap-icons/insert-right-icon";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useTableOverlays } from "../table-overlays";

interface TableInsertRowColButtonProps {
  target?: "row" | "col";
  orientation?: "before" | "after";
  text?: string;
  onAction?: () => void;
  className?: string;
}

export function TableInsertRowColumnButton({
  target,
  orientation,
  text,
  onAction,
  className,
}: TableInsertRowColButtonProps) {
  const { editor } = useTableOverlays();

  if (!editor) return null;

  return (
    <Button
      variant="ghost"
      className={className}
      onClick={() => {
        if (target === "row") {
          if (orientation === "before") {
            editor.commands.addRowBefore();
          } else {
            editor.commands.addRowAfter();
          }
        } else if (target === "col") {
          if (orientation === "before") {
            editor.commands.addColumnBefore();
          } else {
            editor.commands.addColumnAfter();
          }
        }
        onAction?.();
      }}
    >
      {orientation === "before" && (
        <InsertLeftIcon className="tiptap-button-icon" />
      )}
      {orientation === "after" && (
        <InsertRightIcon className="tiptap-button-icon" />
      )}
      {text && <span>{text}</span>}
    </Button>
  );
}
