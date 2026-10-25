import { useState } from "react";
import { Copy, Check, MessageSquareText, PenLine } from "src/components/icons";
import "./cell-overlay.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";
import type { DatabaseView } from "src/types";

function PeekIcon() {
  return (
    <svg
      className="tiptap-button-icon"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1.25"
        y="2.25"
        width="11.5"
        height="9.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <rect x="7.25" y="4" width="4" height="6" rx="0.75" fill="currentColor" />
    </svg>
  );
}

export function CellOverlay({
  copiable,
  getCopyText,
  onComment,
  onOpen,
  viewType = "table",
  // List title toggle: pencil (focus to edit) ↔ panel (open page).
  editing,
  onEdit,
}: {
  copiable: boolean;
  getCopyText: () => string;
  onComment?: () => void;
  onOpen?: () => void;
  viewType?: DatabaseView["type"];
  /** List title only: whether the title is currently being edited. */
  editing?: boolean;
  /** List title only: focus the title inline to start editing. */
  onEdit?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  // ── List view: only the title cell shows an overlay — the two-state toggle.
  if (viewType === "list") {
    // Only render for the title cell (the one given an open/edit handler).
    if (!onOpen && !onEdit) return null;
    return (
      <Button
        type="button"
        className={`db-cell-overlay-open db-cell-overlay-open--list${editing ? " is-editing" : ""}`}
        aria-label={editing ? "Open page" : "Edit title"}
        tooltip={editing ? "Open page" : "Edit title"}
        // pointerdown, not click: while editing, a click blurs the field first.
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (editing) onOpen?.();
          else onEdit?.();
        }}
        // pointerdown's preventDefault doesn't stop the button taking focus
        // (that comes from mousedown); without this the title loses focus
        // straight away and the button flips back to Edit.
        onMouseDown={(e) => e.preventDefault()}
      >
        {editing ? (
          <PeekIcon />
        ) : (
          <PenLine className="tiptap-button-icon" size={14} />
        )}
      </Button>
    );
  }

  // ── Table view: Open button on the title cell.
  if (onOpen) {
    return (
      <Button
        type="button"
        className="db-cell-overlay-open"
        aria-label="Open page"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpen();
        }}
      >
        <PeekIcon />
        <span className="tiptap-button-text">Open</span>
      </Button>
    );
  }

  // ── Table view: comment + copy on non-title cells.
  const doCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = getCopyText();
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="db-cell-overlay" contentEditable={false} aria-hidden>
      <Button
        type="button"
        className="db-cell-overlay__btn"
        aria-label="Comment"
        tooltip="Comment"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onComment?.();
        }}
      >
        <MessageSquareText className="tiptap-button-icon" size={14} />
      </Button>
      {copiable && (
        <Button
          type="button"
          className="db-cell-overlay__btn"
          aria-label={copied ? "Copied" : "Copy"}
          tooltip={copied ? "Copied" : "Copy"}
          onClick={doCopy}
        >
          {copied ? (
            <Check className="tiptap-button-icon" size={14} />
          ) : (
            <Copy className="tiptap-button-icon" size={14} />
          )}
        </Button>
      )}
    </div>
  );
}
