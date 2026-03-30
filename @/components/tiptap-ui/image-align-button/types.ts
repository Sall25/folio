import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
import type { Editor } from "@tiptap/core";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlignValue = "left" | "center" | "right";

export interface UseImageAlignProps {
  editor: Editor | null;
  align: AlignValue;
  extensionName?: string;
  attributeName?: string;
  hideWhenUnavailable?: boolean;
  onAligned?: () => void;
}

export interface UseImageAlignReturn {
  isVisible: boolean;
  canAlign: boolean;
  isActive: boolean;
  handleImageAlign: () => boolean;
  label: string;
  shortcutKeys: string;
  Icon: React.FC<{ className?: string }>;
}

export interface ImageAlignButtonProps
  extends UseImageAlignProps, Pick<ButtonProps, "tooltip" | "showTooltip"> {
  text?: string;
  showShortcut?: boolean;
}
