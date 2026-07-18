import { useState } from "react";
import { PanelRightOpen, Pencil } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import type { PageCover } from "src/types";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { CellEditorPopover } from "./cell-editor-popover";
import { AutoTextarea } from "./auto-textarea";
import "./title-cell-display.scss";

export interface TitleCellDisplayProps {
  value: string;
  onChange: (value: string) => void;
  icon?: PageCover | null;
  hasPage?: boolean;
  onOpen?: () => void;
  readonly?: boolean;
  maxRows?: number;
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
  maxRows = 8,
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
    if (draft !== value) onChange(draft);
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
                  styles={{ color: "var(--tt-text-secondary)" }}
                />
              </span>
            )}
            <span className="db-cell-title__text">{value || "Untitled"}</span>
          </div>
        }
      >
        {(close) => (
          <AutoTextarea
            className="db-cell-title__field"
            value={draft}
            maxRows={maxRows}
            placeholder="Untitled"
            onChange={setDraft}
            onBlur={() => commit(close)}
            onKeyDown={(e) => {
              // Enter commits; Shift+Enter inserts a newline.
              if (e.key === "Enter" && !e.shiftKey) {
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

      {/* Chrome, hidden while editing. The Spacer lives inside the condition too
          — left mounted, it would push the editor box 10px left the moment the
          button disappeared. */}
      {showOpenButton && (
        <>
          <Button
            className="open-button"
            style={{
              minHeight: 20,
              height: "20px !important",
              fontSize: 14,
              minWidth: openVariant === "edit" ? "fit-content" : 68,
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
        </>
      )}
    </CardItemGroup>
  );
}
