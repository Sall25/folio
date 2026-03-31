import { Button } from "@/components/tiptap-ui-primitive/button";
import { useToggleHeaderRowCol } from "./useToggleHeaderRowCol";
import { ColumnHeaderIcon, RowHeaderIcon } from "@/components/tiptap-icons";

interface Props {
  target: "row" | "col";
  hideWhenUnavailable?: boolean;
  text?: string;
  onAction?: () => void;
  className?: string;
}

export function TableToggleHeaderRowColButton({
  target,
  hideWhenUnavailable,
  text,
  onAction,
  className,
}: Props) {
  const { isActive, isVisible, toggle } = useToggleHeaderRowCol({
    target,
    hideWhenUnavailable,
  });

  if (!isVisible) return null;

  return (
    <Button
      variant="ghost"
      // data-highlighted={isActive ? true : false}
      data-active-state={isActive ? "on" : "off"}
      onClick={() => {
        toggle();
        onAction?.();
      }}
      className={className}
    >
      {target === "row" && <RowHeaderIcon className="tiptap-button-icon" />}
      {target === "col" && <ColumnHeaderIcon className="tiptap-button-icon" />}
      {text && <span>{text}</span>}
    </Button>
  );
}
