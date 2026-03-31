import React from "react";
import { Editor } from "@tiptap/react";
import { ArrowUpIcon } from "@/components/tiptap-icons";
import { ArrowDownIcon } from "@/components/tiptap-icons";
import { useMoveNode } from "./use-move-node-options";
import type { MoveDirection } from "./types";

// ─── MoveNodeButton ───────────────────────────────────────────────────────────

export interface MoveNodeButtonProps {
  /** The Tiptap editor instance */
  editor: Editor | null;
  /** Direction to move */
  direction: MoveDirection;
  /** Hide the button when movement is not possible */
  hideWhenUnavailable?: boolean;
  /** Show keyboard shortcut badge */
  showShortcut?: boolean;
  /** Optional text label alongside icon */
  text?: string;
  /** Callback after a successful move */
  onMoved?: (direction: MoveDirection) => void;
  /** Additional class names */
  className?: string;
}

export function MoveNodeButton({
  editor,
  direction,
  hideWhenUnavailable = false,
  showShortcut = false,
  text,
  onMoved,
  className = "",
}: MoveNodeButtonProps) {
  const { canMove, isVisible, handleMove, label, shortcutLabel } = useMoveNode({
    editor,
    direction,
    hideWhenUnavailable,
    onMoved,
  });

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={handleMove}
      disabled={!canMove}
      aria-label={label}
      title={`${label} (${shortcutLabel})`}
      data-direction={direction}
      className={[
        "move-node-button",
        `move-node-button--${direction}`,
        !canMove ? "move-node-button--disabled" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 8px",
        borderRadius: "4px",
        border: "1px solid transparent",
        background: "transparent",
        cursor: canMove ? "pointer" : "not-allowed",
        opacity: canMove ? 1 : 0.4,
        fontSize: "12px",
        color: "currentColor",
        transition: "background 0.15s, opacity 0.15s",
      }}
      onMouseEnter={(e) => {
        if (canMove) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(0,0,0,0.06)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {direction === "up" ? <ArrowUpIcon /> : <ArrowDownIcon />}
      {text && <span>{text}</span>}
      {showShortcut && (
        <span
          style={{
            fontSize: "10px",
            opacity: 0.6,
            background: "rgba(0,0,0,0.07)",
            borderRadius: "3px",
            padding: "1px 4px",
            fontFamily: "monospace",
          }}
        >
          {shortcutLabel}
        </span>
      )}
    </button>
  );
}

// ─── Convenience pair component ───────────────────────────────────────────────

export interface MoveNodeControlsProps extends Omit<
  MoveNodeButtonProps,
  "direction"
> {
  /** orientation of the button pair */
  layout?: "horizontal" | "vertical";
}

/**
 * Renders both Up and Down move buttons as a pair.
 * Useful in drag handles or block toolbars.
 */
export function MoveNodeControls({
  layout = "vertical",
  ...props
}: MoveNodeControlsProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: layout === "vertical" ? "column" : "row",
        gap: "2px",
      }}
      aria-label="Move node controls"
    >
      <MoveNodeButton {...props} direction="up" />
      <MoveNodeButton {...props} direction="down" />
    </div>
  );
}
