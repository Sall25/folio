import { Editor } from "@tiptap/react";
import { useResetAllFormatting } from "./use-reset-all-formatting";
import "./reset-formatting-button.scss";
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";
import { Button } from "src/components/tiptap-ui-primitive/button";

interface ResetFormattingButtonProps {
  editor?: Editor | null;
  preserveMarks?: string[];
  hideWhenUnavailable?: boolean;
  showShortcut?: boolean;
  text?: string;
  onResetAllFormatting?: () => void;
}

export default function ResetFormattingButton({
  editor: providedEditor,
  preserveMarks,
  hideWhenUnavailable,
  showShortcut = false,
  text,
  onResetAllFormatting,
}: ResetFormattingButtonProps) {
  const { editor } = useTiptapEditor(providedEditor);
  const {
    isVisible,
    canReset,
    handleResetFormatting,
    label,
    shortcutKeys,
    Icon,
  } = useResetAllFormatting({
    editor,
    preserveMarks,
    hideWhenUnavailable,
    onResetAllFormatting,
  });

  if (!isVisible) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      role="menuitem"
      onClick={handleResetFormatting}
      disabled={!canReset}
      aria-label={label}
      title={showShortcut ? `${label} (${shortcutKeys})` : label}
      className="reset-btn"
    >
      <Icon className="tiptap-button-icon" />
      {text && <span>{text}</span>}
      {showShortcut && <kbd className="shortcut-badge">{shortcutKeys}</kbd>}
    </Button>
  );
}
