import { Button } from "src/components/tiptap-ui-primitive/button";
import { UseClearRowCol } from "./use-clear-row-col";
import { ClearIcon } from "src/components/tiptap-icons";

interface ClearRowColButtonProps {
  target?: "row" | "col";
  hideWhenUnavailable?: boolean;
  text?: string;
  onAction?: () => void;
  className?: string;
}
export function TableClearRowColButton({
  target = "row",
  hideWhenUnavailable = false,
  text,
  onAction,
  className,
}: ClearRowColButtonProps) {
  const { isVisible, clear } = UseClearRowCol({ target, hideWhenUnavailable });

  if (!isVisible) return null;

  return (
    <Button
      variant="ghost"
      role="option"
      tabIndex={-1}
      onClick={() => {
        clear();
        onAction?.();
      }}
      className={className}
    >
      <ClearIcon className="tiptap-button-icon" />
      {text && <span>{text}</span>}
    </Button>
  );
}
