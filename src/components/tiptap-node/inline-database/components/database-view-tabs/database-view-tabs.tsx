import { Plus } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { ViewIcon } from "../database-toolbar/view-icon";
import { ViewPopover } from "../database-toolbar/view-popover";
import type { UseDatabaseReturn } from "../../hooks";
import type { DatabaseAttrs, DatabaseView } from "../../types/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { useState } from "react";
import "./database-view-tabs.scss";

interface DatabaseViewTabsProps {
  attrs: DatabaseAttrs;
  db: UseDatabaseReturn;
  onRename: () => void;
  onUpdateAttributes?: (attrs: DatabaseAttrs) => void;
  /** When locked: no add-view, no rename/delete-view. View SWITCHING stays
      allowed (clicking a tab is reading, not structural). */
  locked?: boolean;
  /** Hover-reveal: the add-view "+" is hidden (space kept) until the database
      node is hovered. Tabs themselves are always visible. */
  hovered?: boolean;
}

const VIEW_TYPES: { type: DatabaseView["type"]; label: string }[] = [
  { type: "table", label: "Table" },
  { type: "board", label: "Board" },
  { type: "list", label: "List" },
  { type: "gallery", label: "Gallery" },
  { type: "calendar", label: "Calendar" },
  { type: "timeline", label: "Timeline" },
];

export function DatabaseViewTabs({
  attrs,
  db,
  onRename,
  onUpdateAttributes,
  locked = false,
  hovered = false,
}: DatabaseViewTabsProps) {
  const [open, setOpen] = useState(false);

  // Keep the "+" visible while its picker is open, even if the mouse leaves.
  const showAdd = hovered || open;

  return (
    <div
      className="db-view-tabs"
      contentEditable={false}
      onMouseDown={(e) => e.preventDefault()}
    >
      {attrs.views.map((view) => {
        const isActive = view.id === attrs.activeViewId;

        // Active tab: when locked, render a plain switch-only tab instead of
        // the ViewPopover (which exposes rename/delete/config). When unlocked,
        // the ViewPopover gives the full management menu.
        if (isActive) {
          if (locked) {
            return (
              <Button
                variant="ghost"
                key={view.id}
                data-active-state="on"
                style={{
                  borderRadius: "var(--tt-radius-xl)",
                  color: "var(--tt-text-primary)",
                  fontSize: 14,
                  lineHeight: 1.5,
                  fontWeight: 500,
                  fontFamily: "inherit",
                  minWidth: 32,
                  minHeight: 26,
                }}
              >
                <ViewIcon view={view} />
                <span className="tiptap-button-text">{view.name}</span>
              </Button>
            );
          }
          return (
            <ViewPopover
              key={view.id}
              attrs={attrs}
              view={view}
              onRename={onRename}
              onDelete={() => db.deleteView(view.id)}
              canDelete={attrs.views.length > 1}
              active={isActive}
              onShowDatabaseTitle={() =>
                onUpdateAttributes?.({ ...attrs, hideTitle: false })
              }
            />
          );
        }

        // Inactive tab: switching is always allowed (reading), locked or not.
        return (
          <Button
            variant="ghost"
            key={view.id}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              db.setActiveView(view.id);
            }}
            style={{
              borderRadius: "var(--tt-radius-xl)",
              fontSize: 14,
              lineHeight: 1.5,
              fontWeight: 500,
              fontFamily: "inherit",
              minWidth: 32,
              minHeight: 26,
            }}
          >
            <ViewIcon view={view} />
            <span className="tiptap-button-text">{view.name}</span>
          </Button>
        );
      })}

      {/* Add view — omitted when locked, hover-revealed otherwise. */}
      {!locked && (
        <div
          style={{
            display: "inline-flex",
            opacity: showAdd ? 1 : 0,
            pointerEvents: showAdd ? "auto" : "none",
            transition: "opacity 0.2s ease",
          }}
        >
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="db-view-tab db-view-tab--add"
                aria-label="Add view"
              >
                <Plus size={13} />
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
                        db.addView(type, label);
                        setOpen(false);
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
        </div>
      )}
    </div>
  );
}
