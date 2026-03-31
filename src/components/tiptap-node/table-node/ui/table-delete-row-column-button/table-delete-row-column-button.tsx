import { DeleteNodeIcon } from "src/components/tiptap-icons";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useTableOverlays } from "../table-overlays";

interface TableDeleteRowColProps {
  target?: "row" | "col";
  text?: string;
  onAction?: () => void;
  hideWhenUnavailable?: boolean;
  className?: string;
}

export function TableDeleteRowColButton({
  target = "row",
  text,
  onAction,
  className,
}: TableDeleteRowColProps) {
  const { editor } = useTableOverlays();

  // if (isLastCol && hideWhenUnavailable) return null;

  return (
    <Button
      variant="ghost"
      className={className}
      onClick={() => {
        if (target === "row") {
          editor?.commands.deleteRowAtIndex();
          // editor?.commands.deleteRow();
        } else {
          editor?.commands.deleteColAtIndex();
          // editor?.commands.deleteColumn();
        }
        onAction?.();
      }}
    >
      <DeleteNodeIcon className="tiptap-button-icon" />
      {text && <span>{text}</span>}
    </Button>
  );
}
