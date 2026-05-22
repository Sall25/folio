import { ReplaceIcon } from "src/components/tiptap-icons";
import {
  Button,
  type ButtonProps,
} from "src/components/tiptap-ui-primitive/button";
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";
import type { Editor } from "@tiptap/core";
import { useReplaceImage } from "./use-replace-image";

interface ReplaceImageProps extends Pick<
  ButtonProps,
  "tooltip" | "showTooltip"
> {
  editor?: Editor | null;
  text?: string;
  hideWhenUnavailable?: boolean;
}

export function ReplaceImageButton({
  editor: providedEditor,
  text,
  hideWhenUnavailable = false,
  tooltip = "Replace",
  showTooltip,
}: ReplaceImageProps) {
  const { editor } = useTiptapEditor(providedEditor);

  const { isVisible } = useReplaceImage({
    editor,
    hideWhenUnavailable,
  });

  if (!isVisible) return null;

  return (
    <Button
      variant="ghost"
      tooltip={tooltip}
      showTooltip={showTooltip}
      onClick={() => {
        editor?.commands.replaceImage();
      }}
    >
      <ReplaceIcon className="tiptap-button-icon" />
      {text && <span>{text}</span>}
    </Button>
  );
}
