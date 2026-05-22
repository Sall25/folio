import {
  Button,
  type ButtonProps,
} from "src/components/tiptap-ui-primitive/button";
import { useImageDownload } from "./use-image-download";
import type { Editor } from "@tiptap/core";
import { DownloadIcon } from "lucide-react";

interface ImageDownloadButtonProps extends Pick<
  ButtonProps,
  "tooltip" | "showTooltip"
> {
  editor?: Editor | null;
  text?: string;
  hideWhenUnavailable?: boolean;
  onDownloaded?: () => void;
}

export const ImageDownloadButton: React.FC<ImageDownloadButtonProps> = ({
  editor,
  text,
  hideWhenUnavailable = false,
  onDownloaded,
  tooltip = "Download image",
  showTooltip,
}) => {
  const { isVisible, canDownload, handleImageDownload } = useImageDownload({
    editor,
    onDownloaded,
  });

  if (hideWhenUnavailable && !isVisible) return null;

  return (
    <Button
      type="button"
      role="menuitem"
      variant="ghost"
      onClick={() => handleImageDownload()}
      tooltip={tooltip}
      showTooltip={showTooltip}
      disabled={!canDownload}
      aria-label="Download image"
      aria-pressed={false}
      data-active-state="off"
    >
      <DownloadIcon className="tiptap-button-icon" />
      {text && <span>{text}</span>}
    </Button>
  );
};
