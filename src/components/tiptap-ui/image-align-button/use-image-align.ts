import { useCallback, useState, useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type {
  UseImageAlignProps,
  UseImageAlignReturn,
  AlignValue,
} from "./types";

import { ALIGN_CONFIG } from "./config";
import { isImageAlignActive, shouldShowButton, setImageAlign } from "./utils";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useImageAlign({
  editor,
  align,
  extensionName = "image",
  attributeName = "data-align",
  hideWhenUnavailable = false,
  onAligned,
}: UseImageAlignProps): UseImageAlignReturn {
  const config = ALIGN_CONFIG[align];

  const [, setSelectionKey] = useState(0); // triggers re-render on update

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      setSelectionKey((prev) => prev + 1);
    };

    // Tiptap events
    editor.on("selectionUpdate", handleUpdate);
    editor.on("transaction", handleUpdate);

    return () => {
      editor.off("selectionUpdate", handleUpdate);
      editor.off("transaction", handleUpdate);
    };
  }, [editor]);

  const canAlign = true; //editor ? canSetImageAlign(editor) : false;
  const isActive = editor ? isImageAlignActive(editor, align) : false;
  const isVisible = editor
    ? shouldShowButton({
        editor,
        align,
        hideWhenUnavailable,
        extensionName,
        attributeName,
      })
    : false;

  const handleImageAlign = useCallback((): boolean => {
    const result = setImageAlign(editor, align);
    if (result) onAligned?.();
    return result;
  }, [editor, align, onAligned]);

  // Hotkeys
  const hotkeyMap: Record<AlignValue, string> = {
    left: "alt+shift+l",
    center: "alt+shift+e",
    right: "alt+shift+r",
  };

  useHotkeys(
    hotkeyMap[align],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      e.preventDefault();
      handleImageAlign();
    },
    { enableOnContentEditable: true },
  );

  return {
    isVisible,
    canAlign,
    isActive,
    handleImageAlign,
    label: config.label,
    shortcutKeys: config.shortcut,
    Icon: config.Icon,
  };
}
