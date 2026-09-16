import { memo, useEffect, useRef, useState } from "react";
import { Ellipsis, Eye, EyeOff, Plus } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import "./database-title-bar.scss";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { ViewIcon } from "../database-toolbar/view-icon";
import type { DatabaseView } from "src/types";
import { useDatabaseContext } from "../../context/database-context";

const VIEW_TYPES: { type: DatabaseView["type"]; label: string }[] = [
  { type: "table", label: "Table" },
  { type: "board", label: "Board" },
  { type: "list", label: "List" },
  { type: "gallery", label: "Gallery" },
  { type: "calendar", label: "Calendar" },
  { type: "timeline", label: "Timeline" },
];

interface DatabaseTitleBarProps {
  /** Create a view. Same path DatabaseViewTabs' "+" uses (db.addView), so both
      entry points build views identically. Omit to hide the "+" — e.g. in the
      multi-view layout, where the tabs already carry their own add-view. */
  onAddView?: (type: DatabaseView["type"], label: string) => void;
}

function DatabaseTitleBarImpl({ onAddView }: DatabaseTitleBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { title, onTitleChange, attrs, updateAttributes } =
    useDatabaseContext();
  const locked = !!attrs.locked;
  const hideTitle = attrs.hideTitle;

  // ONE element, always mounted, deliberately UNCONTROLLED — no `value` prop,
  // no onChange→state. A controlled input is rewritten by React on every
  // keystroke, which is what forced the caret to the end and made typing feel
  // laggy. Here the DOM owns the text, so the caret stays where you put it.
  //
  // An <input> (not a contentEditable div) matters because this lives inside a
  // ProseMirror NodeView: PM fights a bare contentEditable for selection, but
  // treats form controls as editing islands and leaves them alone.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    if (document.activeElement === el) return; // never yank the caret mid-edit
    if (el.value !== title) el.value = title;
  }, [title]);

  function commit() {
    const el = inputRef.current;
    if (!el) return;
    const next = el.value.trim();
    if (next && next !== title) {
      onTitleChange(next);
    } else {
      el.value = title; // empty or unchanged → snap back
    }
  }

  return (
    <div
      className="db-title-bar"
      style={{ display: hideTitle ? "none" : "flex" }}
    >
      <input
        ref={inputRef}
        className="db-title-bar__title"
        defaultValue={title}
        placeholder="New database"
        readOnly={locked}
        spellCheck={false}
        autoComplete="off"
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur(); // blur commits
          }
          if (e.key === "Escape") {
            e.preventDefault();
            e.currentTarget.value = title;
            e.currentTarget.blur();
          }
        }}
        // Inside a ProseMirror NodeView: keep PM's global handlers from
        // reinterpreting clicks/keys that belong to this field.
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDownCapture={(e) => e.stopPropagation()}
      />

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
                onClick={() =>
                  locked
                    ? undefined
                    : updateAttributes({ ...attrs, hideTitle: !hideTitle })
                }
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

      {!locked && onAddView && (
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="db-title-bar__add-view"
              aria-label="Add view"
              tooltip="Add view"
            >
              <Plus size={14} className="tiptap-button-icon" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="db-panel">
            <Card style={{ padding: "5px 10px", minWidth: 160 }}>
              <CardItemGroup>
                {VIEW_TYPES.map(({ type, label }) => (
                  <Button
                    key={type}
                    variant="ghost"
                    style={{ justifyContent: "flex-start", width: "100%" }}
                    onClick={() => {
                      onAddView(type, label);
                      setAddOpen(false);
                    }}
                  >
                    <ViewIcon view={{ type } as DatabaseView} />
                    <span className="tiptap-button-text">{label}</span>
                  </Button>
                ))}
              </CardItemGroup>
            </Card>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export const DatabaseTitleBar = memo(DatabaseTitleBarImpl);
