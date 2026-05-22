import { CaptionIcon } from "src/components/tiptap-icons";
import {
  Button,
  type ButtonProps,
} from "src/components/tiptap-ui-primitive/button";
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";
import type { Editor } from "@tiptap/core";
import { useCaption } from "./use-caption";

interface CaptionButtonProps extends Pick<
  ButtonProps,
  "tooltip" | "showTooltip"
> {
  editor?: Editor | null;
  text?: string;
  hideWhenUnavailable?: boolean;
  allowedBlockTypes?: string[];
}

export function CaptionButton({
  editor: providedEditor,
  text,
  hideWhenUnavailable = false,
  allowedBlockTypes = ["image"],
  tooltip = "Caption",
  showTooltip,
}: CaptionButtonProps) {
  const { editor } = useTiptapEditor(providedEditor);

  const { isVisible } = useCaption({
    editor,
    allowedBlockTypes,
    hideWhenUnavailable,
  });

  if (!isVisible) return null;

  return (
    <Button
      variant="ghost"
      onClick={() => {
        editor?.commands.focusImageCaption();
      }}
      tooltip={tooltip}
      showTooltip={showTooltip}
    >
      <CaptionIcon className="tiptap-button-icon" />
      {text && <span>{text}</span>}
    </Button>
  );
}
