import { useCallback, useEffect } from "react";
import { Editor } from "@tiptap/core";
import type { MoveDirection } from "./types";
import { canMoveNode, moveNode } from "./utils";

// ─── Hook ─────────────────────────────────────────────────────────────────────
export interface UseMoveNodeOptions {
  editor: Editor | null;
  direction: MoveDirection;
  hideWhenUnavailable?: boolean;
  onMoved?: (direction: MoveDirection) => void;
}

export interface UseMoveNodeReturn {
  canMove: boolean;
  isVisible: boolean;
  handleMove: () => void;
  label: string;
  shortcutLabel: string;
}

export function useMoveNode({
  editor,
  direction,
  hideWhenUnavailable = false,
  onMoved,
}: UseMoveNodeOptions): UseMoveNodeReturn {
  const can = editor ? canMoveNode(editor, direction) : false;
  const isVisible = hideWhenUnavailable ? can : true;

  const label = direction === "up" ? "Move Up" : "Move Down";
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform);
  const mod = isMac ? "⌘" : "Ctrl";
  const arrow = direction === "up" ? "↑" : "↓";
  const shortcutLabel = `${mod}⇧${arrow}`;

  const handleMove = useCallback(() => {
    if (!editor) return;
    const success = moveNode(editor, direction);
    if (success) onMoved?.(direction);
  }, [editor, direction, onMoved]);

  // Register keyboard shortcut
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const modKey = e.metaKey || e.ctrlKey;
      const arrowMatch =
        direction === "up" ? e.key === "ArrowUp" : e.key === "ArrowDown";

      if (modKey && e.shiftKey && arrowMatch) {
        e.preventDefault();
        const success = moveNode(editor, direction);
        if (success) onMoved?.(direction);
      }
    };

    const dom = editor.view.dom;
    dom.addEventListener("keydown", handleKeyDown);
    return () => dom.removeEventListener("keydown", handleKeyDown);
  }, [editor, direction, onMoved]);

  return { canMove: can, isVisible, handleMove, label, shortcutLabel };
}
