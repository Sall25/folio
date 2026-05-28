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
}: DatabaseViewTabsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="db-view-tabs">
      {attrs.views.map((view) => {
        const isActive = view.id === attrs.activeViewId;
        return isActive ? (
          <ViewPopover
            key={view.id}
            view={view}
            onRename={onRename}
            onDelete={() => db.deleteView(view.id)}
            canDelete={attrs.views.length > 1}
            active={isActive}
          />
        ) : (
          <Button
            variant="ghost"
            key={view.id}
            onClick={() => db.setActiveView(view.id)}
            style={{
              borderRadius: "var(--tt-radius-sm)",
              minHeight: 22,
              height: 22,
            }}
          >
            <ViewIcon view={view} />
            <span className="tiptap-button-text">{view.name}</span>
          </Button>
        );
      })}

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
  );
}
