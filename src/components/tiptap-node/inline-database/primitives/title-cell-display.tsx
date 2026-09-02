import { useState } from "react";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import type { PageCover } from "src/types";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { CellEditorPopover } from "./cell-editor-popover";
import "./title-cell-display.scss";
import { Input } from "src/components/tiptap-ui-primitive/input";

export interface TitleCellDisplayProps {
  value: string;
  onChange: (value: string) => void;
  icon?: PageCover | null;
  readonly?: boolean;
  showPageIcon?: boolean;
}

export function TitleCellDisplay({
  value,
  onChange,
  icon,
  readonly,
  showPageIcon = true,
}: TitleCellDisplayProps) {
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
