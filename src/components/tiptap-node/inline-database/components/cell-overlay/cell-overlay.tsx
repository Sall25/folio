import { useState } from "react";
import {
  Copy,
  Check,
  MessageSquareText,
  PanelRightOpen,
  Pencil,
} from "lucide-react";
import "./cell-overlay.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";
import type { DatabaseView } from "src/types";

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
        className="db-cell-overlay-open"
        aria-label={editing ? "Open page" : "Edit title"}
        // pointerdown, not click: while editing, a click blurs the field first.
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (editing) onOpen?.();
          else onEdit?.();
        }}
      >
        {editing ? (
          <PanelRightOpen className="tiptap-button-icon" size={14} />
        ) : (
          <Pencil className="tiptap-button-icon" size={14} />
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
        <PanelRightOpen className="tiptap-button-icon" size={14} />
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
