import { useRef, useState } from "react";
import { PanelRightOpen } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import type { PageCover } from "src/components/tiptap-templates/simple/types";
import "./title-cell-display.scss";

export interface TitleCellDisplayProps {
  value: string;
  onChange: (value: string) => void;
  /** cover of the linked (or template) page, for the leading icon */
  icon?: PageCover | null;
  /** whether the row has a linked page (controls the Open button) */
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [hover, setHover] = useState(false);
  const focused = useRef(false);

  // useEffect(() => {
  //   if (!focused.current) setDraft(value);
  // }, [value]);

  function commit() {
    setEditing(false);
    focused.current = false;
    const next = draft;
    if (next !== value) onChange(next);
  }

  return (
    <div
      className={`db-td--title${editing ? " editing" : ""}`}
      onMouseOver={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: "flex" }}
    >
      <div
        className="db-cell-title"
        onClick={() => !readonly && setEditing(true)}
      >
        {editing && !readonly ? (
          <input
            className="title-cell-input"
            autoFocus
            placeholder="Untitled"
            value={draft}
            onFocus={() => (focused.current = true)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(value);
                setEditing(false);
                focused.current = false;
              }
            }}
          />
        ) : (
          <Button
            variant="ghost"
            style={{
              background: "transparent",
              width: "100%",
              justifyContent: "flex-start",
              color: "var(--tt-theme-text)",
              fontWeight: 500,
            }}
            onClick={() => !readonly && setEditing(true)}
          >
            {icon && (
              <PageItemIcon cover={icon} styles={{ width: 16, height: 16 }} />
            )}
            <span>{value || "Untitled"}</span>
          </Button>
        )}
      </div>

      {hasPage && !editing && onOpen && (
        <Button
          className="db-cell-title__open"
          style={{
            minHeight: 18,
            height: 24,
            borderRadius: "var(--tt-radius-sm)",
            opacity: hover ? 1 : 0,
            transition: "opacity 0.15s ease",
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
    </div>
  );
}
