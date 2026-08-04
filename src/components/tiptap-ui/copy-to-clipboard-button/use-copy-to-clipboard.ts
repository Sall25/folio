import { useState, useEffect, useCallback } from "react";
import type { Editor } from "@tiptap/core";

import { canCopyToClipboard, copyToClipboard } from "./utils";
import { Check, CopyIcon } from "lucide-react";
import { useCopyToast } from "src/hooks/use-copy-toast";

export interface UseCopyToClipboardOptions {
  /** The Tiptap editor instance. */
  editor: Editor | null;
  /** Preserve HTML formatting when copying. @default true */
  copyWithFormatting?: boolean;
  /** Hide button when copying is not possible. @default false */
  hideWhenUnavailable?: boolean;
  /** Callback fired after a successful copy. */
  onCopied?: () => void;
  /** How long (ms) to show the "copied" state. @default 2000 */
  resetDelay?: number;
}

export interface UseCopyToClipboardReturn {
  /** Whether the button should be rendered at all. */
  isVisible: boolean;
  /** Whether a copy action can be performed right now. */
  canCopy: boolean;
  /** Whether the content was just copied (drives success state). */
  isCopied: boolean;
  /** Trigger the copy action. */
  handleCopy: () => Promise<void>;
  /** Accessible label for the button. */
  label: string;
  /** Keyboard shortcut string for display. */
  shortcutKeys: string;
  /** Copy icon — swaps to check icon when isCopied is true. */
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

export function useCopyToClipboard({
  editor,
  copyWithFormatting = true,
  hideWhenUnavailable = false,
  onCopied,
  resetDelay = 2000,
}: UseCopyToClipboardOptions): UseCopyToClipboardReturn {
  const [isCopied, setIsCopied] = useState(false);
  const { show } = useCopyToast();

  const canCopy = canCopyToClipboard(editor);
  const isVisible = hideWhenUnavailable ? canCopy : true;

  const handleCopy = useCallback(async () => {
    if (!canCopy) return;
    const success = await copyToClipboard(editor, copyWithFormatting);

    if (success) {
      setIsCopied(true);
      onCopied?.();
      show();
    }
  }, [editor, canCopy, copyWithFormatting, onCopied, show]);

  // Reset after delay
  useEffect(() => {
    if (!isCopied) return;
    const id = setTimeout(() => setIsCopied(false), resetDelay);
    return () => clearTimeout(id);
  }, [isCopied, resetDelay]);

  // Keyboard shortcut: Cmd/Ctrl + Shift + C (to avoid overriding browser copy)
  useEffect(() => {
    if (!editor) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "c") {
        e.preventDefault();
        handleCopy();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editor, handleCopy]);

  const isMac =
    typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
  const shortcutKeys = isMac ? "⌘⇧C" : "ModC";

  return {
    isVisible,
    canCopy,
    isCopied,
    handleCopy,
    label: isCopied ? "Copied!" : "Copy",
    shortcutKeys,
    Icon: isCopied ? Check : CopyIcon,
  };
}
