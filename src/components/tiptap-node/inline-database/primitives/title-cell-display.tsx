import { useState } from "react";
import { PanelRightOpen } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import { TextareaAutosize } from "src/components/tiptap-ui-primitive/textarea-auto-size";
import type { PageCover } from "src/types";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { CellEditorPopover } from "./cell-editor-popover";
import "./title-cell-display.scss";

export interface TitleCellDisplayProps {
  value: string;
  onChange: (value: string) => void;
  icon?: PageCover | null;
  hasPage?: boolean;
  onOpen?: () => void;
  readonly?: boolean;
}

export function TitleCellDisplay({
  value,
  onChange,
  icon,
  hasPage,
  onOpen,
  readonly,
}: TitleCellDisplayProps) {
  const [hover, setHover] = useState(false);
  const [draft, setDraft] = useState(value);

  // adopt external changes when not actively editing (popover closed resets)
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setDraft(value);
  }

  const commit = (close: () => void) => {
    if (draft !== value) onChange(draft);
    close();
  };

  return (
    <CardItemGroup
      onMouseOver={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
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
            {icon && (
              <span className="db-cell-title__icon">
                <PageItemIcon
                  cover={icon}
                  styles={{
                    // width: 17,
                    // height: 17,
                    color: "var(--tt-text-secondary)",
                  }}
                />
              </span>
            )}
            <span className="db-cell-title__text">{value || "Untitled"}</span>
          </div>
        }
      >
        {(close) => (
          <TextareaAutosize
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

      <Spacer size={10} orientation="horizontal" />
      {hasPage && onOpen && (
        <Button
          style={{
            minHeight: 24,
            height: 24,
            fontSize: 14,
            minWidth: 68,
            alignItems: "center",
            borderRadius: "var(--tt-radius-sm)",
            background: "var(--tt-bg-color)",
            cursor: "pointer",
            border: "1px solid var(--tt-border-color)",
            opacity: hover ? 1 : 0,
            transition: "opacity 0.15s ease",
            flexShrink: 0,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          <PanelRightOpen className="tiptap-button-icon" size={12} />
          <span className="tiptap-button-text">Open</span>
        </Button>
      )}
    </CardItemGroup>
  );
}
