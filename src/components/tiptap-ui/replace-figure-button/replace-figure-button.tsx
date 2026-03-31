import { ReplaceIcon } from "src/components/tiptap-icons";
import {
  Button,
  type ButtonProps,
} from "src/components/tiptap-ui-primitive/button";
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";
import type { Editor } from "@tiptap/core";
import { useReplaceFigure } from "./use-replace-figure";

interface ReplaceFigureProps extends Pick<
  ButtonProps,
  "tooltip" | "showTooltip"
> {
  editor?: Editor | null;
  text?: string;
  hideWhenUnavailable?: boolean;
  allowedBlockTypes?: string[];
}

export function ReplaceFigureButton({
  editor: providedEditor,
  text,
  hideWhenUnavailable = false,
  allowedBlockTypes = ["figure"],
  tooltip = "Replace",
  showTooltip,
}: ReplaceFigureProps) {
  const { editor } = useTiptapEditor(providedEditor);

  const { isVisible } = useReplaceFigure({
    editor,
    allowedBlockTypes,
    hideWhenUnavailable,
  });

  if (!isVisible) return null;

  return (
    <Button
      variant="ghost"
      tooltip={tooltip}
      showTooltip={showTooltip}
      onClick={() => {
        editor?.commands.replaceFigure();
      }}
    >
      <ReplaceIcon className="tiptap-button-icon" />
      {text && <span>{text}</span>}
    </Button>
  );
}
