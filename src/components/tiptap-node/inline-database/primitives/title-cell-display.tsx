import { useState } from "react";
import { PanelRightOpen, Pencil } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import type { PageCover } from "src/types";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { CellEditorPopover } from "./cell-editor-popover";
import "./title-cell-display.scss";

export interface TitleCellDisplayProps {
  value: string;
  onChange: (value: string) => void;
  icon?: PageCover | null;
  hasPage?: boolean;
  onOpen?: () => void;
  readonly?: boolean;
  /**
   * Which affordance the hover button shows. List view uses a pencil (Notion's
   * inline-edit affordance); everywhere else keeps the open-in-panel icon.
   * The caller (TitleCell) sets this from the view type.
   */
  openVariant?: "open" | "edit";
}

export function TitleCellDisplay({
  value,
  onChange,
  icon,
  hasPage,
  onOpen,
  readonly,
  openVariant = "open",
}: TitleCellDisplayProps) {
  const [hover, setHover] = useState(false);
  const [draft, setDraft] = useState(value);

  // The popover's open state is lifted here so the cell's chrome can react to
  // it: while editing, the "Open" button would sit directly on top of the editor
  // box — which is exactly where the text is.
  const [editing, setEditing] = useState(false);

  // Adopt external changes while idle (popover closed).
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setDraft(value);
  }

  const commit = (close: () => void) => {
    // Titles are identifiers — trailing whitespace would surface in the
    // sidebar and page-link chips.
    const next = draft.trim();
    if (next !== value) onChange(next);
    close();
  };

  const showOpenButton = hasPage && onOpen && !editing;

  return (
    <CardItemGroup
      onMouseOver={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      orientation="horizontal"
      style={{
        width: "100%",
        alignItems: "center",
        background: "var(--tt-bg-color)",
        position: "relative",
      }}
    >
      <CellEditorPopover
        readonly={readonly}
        open={editing}
        onOpenChange={setEditing}
        trigger={
          <div className="db-cell-title">
            {icon && (
              <span className="db-cell-title__icon">
                <PageItemIcon
                  cover={icon}
                  styles={{ color: "var(--tt-text-primary)" }}
                  usePrimaryColor
                />
              </span>
            )}
            <span className="db-cell-title__text">{value || "Untitled"}</span>
          </div>
        }
      >
        {(close) => (
          <Input
            // Focus with the caret at the end rather than position 0 — autoFocus
            // alone leaves the caret placement up to the browser.
            ref={(el) => {
              if (!el) return;
              el.focus();
              const end = el.value.length;
              el.setSelectionRange(end, end);
            }}
            className="db-cell-title__field"
            value={draft}
            placeholder="Untitled"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commit(close)}
            onKeyDown={(e) => {
              // Single-line: Enter always commits, no newline case.
              if (e.key === "Enter") {
                e.preventDefault();
                commit(close);
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setDraft(value);
                close();
              }
            }}
          />
        )}
      </CellEditorPopover>

      {/* Chrome, hidden while editing — left mounted it would sit on top of the
          editor box, which is exactly where the text is. */}
      {showOpenButton && (
        <Button
          className="open-button"
          style={{
            minHeight: 20,
            height: "20px !important",
            fontSize: 14,
            minWidth: openVariant === "edit" ? "fit-content" : 70,
            alignItems: "center",
            borderRadius: "var(--tt-radius-sm)",
            cursor: "pointer",
            border: "1px solid var(--tt-border-color)",
            opacity: hover ? 1 : 0,
            transition: "opacity 0.15s ease",
            flexShrink: 0,
            position: "absolute",
            right: 0,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          {openVariant === "edit" ? (
            <Pencil className="tiptap-button-icon" size={12} />
          ) : (
            <PanelRightOpen className="tiptap-button-icon" size={12} />
          )}
          {openVariant === "open" && (
            <span className="tiptap-button-text">Open</span>
          )}
        </Button>
      )}
    </CardItemGroup>
  );
}
