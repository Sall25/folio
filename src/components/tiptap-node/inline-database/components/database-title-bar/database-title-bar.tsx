import { useState, useRef } from "react";
import { Ellipsis, Eye, EyeOff } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import "./database-title-bar.scss";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card } from "src/components/tiptap-ui-primitive/card";

interface DatabaseTitleBarProps {
  title: string;
  hideTitle?: boolean;
  onTitleChange: (title: string) => void;
  onHideTitleChange: (hide: boolean) => void;
  /** When locked, the title is read-only and the options menu (hide title)
      is removed — title/visibility are layout config, frozen when locked. */
  locked?: boolean;
}

export function DatabaseTitleBar({
  title,
  hideTitle = false,
  onTitleChange,
  onHideTitleChange,
  locked = false,
}: DatabaseTitleBarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== title) onTitleChange(trimmed);
  }

  return (
    <div
      className="db-title-bar"
      style={{ display: hideTitle ? "none" : "flex" }}
    >
      {editing && !locked ? (
        <input
          ref={inputRef}
          className="db-title-bar__input"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(title);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          className="db-title-bar__title"
          // locked → plain label, no rename on click
          onClick={
            locked
              ? undefined
              : () => {
                  setDraft(title);
                  setEditing(true);
                }
          }
          style={locked ? { cursor: "default" } : undefined}
        >
          {title || "Untitled database"}
        </button>
      )}

      {/* Options (hide title) is layout config — omitted when locked. */}
      {!locked && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="db-title-bar__options">
              <Ellipsis size={14} className="tiptap-button-icon" />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <Card
              style={{
                boxShadow: "var(--tt-shadow-elevated-sm)",
                padding: "5px 10px",
              }}
            >
              <Button
                variant="ghost"
                onClick={() => onHideTitleChange(!hideTitle)}
              >
                {hideTitle ? (
                  <EyeOff className="tiptap-button-icon" />
                ) : (
                  <Eye className="tiptap-button-icon" />
                )}
                <span className="tiptap-button-text">Hide Title</span>
              </Button>
            </Card>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
