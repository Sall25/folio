import type { ImageAlignButtonProps } from "./types";
import { useImageAlign } from "./use-image-align";
import { ImageAlignShortcutBadge } from "./image-align-shortcut-badge";

import "./image-align-button.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";

// ─── ImageAlignButton ─────────────────────────────────────────────────────────

export const ImageAlignButton: React.FC<ImageAlignButtonProps> = ({
  editor,
  align,
  text,
  extensionName = "image",
  attributeName = "node-align",
  hideWhenUnavailable = false,
  onAligned,
  showShortcut = false,
  tooltip,
  showTooltip,
}) => {
  const {
    isVisible,
    canAlign,
    isActive,
    handleImageAlign,
    label,
    shortcutKeys,
    Icon,
  } = useImageAlign({
    editor,
    align,
    extensionName,
    attributeName,
    hideWhenUnavailable,
    onAligned,
  });

  if (!isVisible) return null;

  return (
    <Button
      type="button"
      role="menuitem"
      variant="ghost"
      onClick={() => {
        handleImageAlign();
      }}
      tooltip={tooltip}
      showTooltip={showTooltip}
      disabled={!canAlign}
      aria-label={label}
      aria-pressed={isActive}
      title={`${label} (${shortcutKeys})`}
      data-active-state={isActive ? "on" : "off"}
    >
      <Icon className="tiptap-button-icon" />
      {text && <span>{text}</span>}
      {showShortcut && <ImageAlignShortcutBadge align={align} />}
    </Button>
  );
};
