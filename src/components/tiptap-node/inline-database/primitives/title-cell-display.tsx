import { useRef, useState } from "react";
import { Pencil, PanelRight } from "lucide-react";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import type { PageCover } from "src/types";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { CellEditorPopover } from "./cell-editor-popover";
import "./title-cell-display.scss";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { Button } from "src/components/tiptap-ui-primitive/button";

export interface TitleCellDisplayProps {
  value: string;
  onChange: (value: string) => void;
  icon?: PageCover | null;
  readonly?: boolean;
  showPageIcon?: boolean;
  /** "popover" (table) uses CellEditorPopover; "inline" (list/board/gallery)
   *  edits the title in place via contentEditable, with a right-side toggle
   *  button that focuses-to-edit, then opens the page once editing. */
  variant?: "popover" | "inline";
  /** Open the page in peek/center — used by the inline variant's toggle button
   *  once the title is in edit mode. */
  onOpen?: () => void;
}

export function TitleCellDisplay({
  value,
  onChange,
  icon,
  readonly,
  showPageIcon = true,
  variant = "popover",
  onOpen,
}: TitleCellDisplayProps) {
  const [draft, setDraft] = useState(value);

  // adopt external changes when not actively editing
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setDraft(value);
  }

  const commit = (close: () => void) => {
    if (draft !== value) onChange(draft);
    close();
  };

  // ── Inline variant (list/board/gallery) ──────────────────────────────────
  const editRef = useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = useState(false);

  if (variant === "inline") {
    const commitInline = () => {
      const next = editRef.current?.textContent ?? "";
      if (next !== value) onChange(next);
      setEditing(false);
    };

    return (
      <CardItemGroup
        orientation="horizontal"
        className="db-cell-title db-cell-title--inline"
        style={{ width: "100%", alignItems: "center" }}
      >
        {icon && showPageIcon && (
          <span className="db-cell-title__icon">
            <PageItemIcon cover={icon} styles={{ width: 17, height: 17 }} />
          </span>
        )}

        <div
          ref={editRef}
          className="db-cell-title__text db-cell-title__text--editable"
          contentEditable={!readonly}
          suppressContentEditableWarning
          spellCheck={false}
          data-empty={!value || undefined}
          onFocus={() => setEditing(true)}
          onBlur={commitInline}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              (e.currentTarget as HTMLElement).blur();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              if (editRef.current) editRef.current.textContent = value;
              (e.currentTarget as HTMLElement).blur();
            }
          }}
        >
          {value}
        </div>

        {!readonly && (
          <Button
            type="button"
            className="db-cell-title__toggle"
            // Pencil (not editing) → focus to edit. Open-panel (editing) →
            // open the page. The icon + action swap on the editing state.
            aria-label={editing ? "Open page" : "Edit title"}
            // Use pointerdown, not click: while editing, a click would first
            // blur the field. pointerdown fires before blur so we can act on
            // the current mode.
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (editing) {
                onOpen?.();
              } else {
                editRef.current?.focus();
                // caret to end
                const sel = window.getSelection();
                if (sel && editRef.current) {
                  const r = document.createRange();
                  r.selectNodeContents(editRef.current);
                  r.collapse(false);
                  sel.removeAllRanges();
                  sel.addRange(r);
                }
              }
            }}
          >
            {editing ? (
              <PanelRight className="tiptap-button-icon" size={15} />
            ) : (
              <Pencil className="tiptap-button-icon" size={14} />
            )}
          </Button>
        )}
      </CardItemGroup>
    );
  }

  // ── Popover variant (table) — unchanged ──────────────────────────────────
  return (
    <CardItemGroup
      orientation="horizontal"
      style={{
        width: "100%",
        alignItems: "center",
        background: "var(--tt-bg-color)",
      }}
    >
      <CellEditorPopover
        readonly={readonly}
        trigger={
          <div className="db-cell-title">
            {icon && showPageIcon && (
              <span className="db-cell-title__icon">
                <PageItemIcon cover={icon} styles={{ width: 17, height: 17 }} />
              </span>
            )}
            <span className="db-cell-title__text">{value || "Untitled"}</span>
          </div>
        }
      >
        {(close) => (
          <Input
            className="db-cell-title__field"
            autoFocus
            placeholder="Untitled"
            value={draft}
            spellCheck={false}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commit(close)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commit(close);
              }
              if (e.key === "Escape") {
                setDraft(value);
                close();
              }
            }}
          />
        )}
      </CellEditorPopover>
    </CardItemGroup>
  );
}
