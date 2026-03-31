import { useState, useEffect, useCallback } from "react";
import type { Editor } from "@tiptap/core";
import { canDuplicateNode, duplicateNode } from "./utils";
import { CopyIcon } from "lucide-react";

interface Props {
  editor: Editor | null
  hideWhenUnavailable: boolean
  onDuplicated?: () => void
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useDuplicate({ editor, hideWhenUnavailable, onDuplicated })
 * Headless hook — wire up any UI you like.
 */
export function useDuplicate({ editor, hideWhenUnavailable = false, onDuplicated }: Props) {
  const [canDuplicate, setCanDuplicate] = useState(false);

  // Re-evaluate on every selection / transaction change
  useEffect(() => {
    if (!editor) return;
    const update = () => setCanDuplicate(canDuplicateNode(editor));
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    update();
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  // Cmd/Ctrl + D shortcut
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (e: any) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        if (editor && editor.isFocused) {
          e.preventDefault();
          if (canDuplicateNode(editor)) {
            const success = duplicateNode(editor);
            if (success && onDuplicated) onDuplicated();
          }
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [editor, onDuplicated]);

  const handleDuplicate = useCallback(() => {
    if (!editor) return false;
    const success = duplicateNode(editor);
    if (success && onDuplicated) onDuplicated();
    return success;
  }, [editor, onDuplicated]);

  const isVisible = hideWhenUnavailable ? canDuplicate : true;

  return {
    isVisible,
    canDuplicate,
    handleDuplicate,
    label: "Duplicate",
    shortcutKeys: "ModD",
    Icon: CopyIcon,
  };
}