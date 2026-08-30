import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type { DatabaseAttrs, DatabaseView } from "src/types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import {
  Edit,
  Eye,
  Link,
  Maximize2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

// import "./view-name-popover.scss";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { DuplicateIcon } from "src/components/tiptap-icons/duplicate-icon";
import { ViewIcon } from "./view-icon";
import { MenuRow } from "../menu-row";

interface ViewNamePopoverProps {
  view: DatabaseView;
  onRename?: (v: boolean) => void;
  onEdit?: () => void;
  onCopyLink?: () => void;
  onOpenAsFullPage?: () => void;
  onShowDatabaseTitle?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  active?: boolean;
  attrs: DatabaseAttrs;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ViewPopover({
  view,
  onRename,
  onEdit,
  onCopyLink,
  onOpenAsFullPage,
  onShowDatabaseTitle,
  onDuplicate,
  onDelete,
  canDelete = true,
  active = false,
  attrs,
  open,
  onOpenChange,
}: ViewNamePopoverProps) {
  const close = () => onOpenChange(false);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          className="db-view-tab"
          data-active-state={active ? "on" : "off"}
          variant="ghost"
        >
          <ViewIcon view={view} />
          <span className="tiptap-button-text">{view.name}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Card
          style={{
            padding: "5px 10px",
            boxShadow: "var(--tt-shadow-elevated-md)",
            border: "1px solid var(--tt-border-color)",
            borderRadius: "var(--tt-radius-sm)",
            minWidth: 220,
          }}
        >
          <MenuRow
            Icon={Edit}
            label="Rename"
            onClick={() => {
              onRename?.(true);
              close();
            }}
          />
          <MenuRow
            Icon={SlidersHorizontal}
            label="Edit view"
            onClick={() => {
              onEdit?.();
              close();
            }}
          />

          <Separator
            orientation="horizontal"
            className="sep"
            style={{ height: 0.5 }}
          />

          <MenuRow
            Icon={Link}
            label="Copy link to view"
            onClick={() => {
              onCopyLink?.();
              close();
            }}
          />
          <MenuRow
            Icon={Maximize2}
            label="Open as full page"
            onClick={() => {
              onOpenAsFullPage?.();
              close();
            }}
          />
          {attrs.hideTitle && (
            <MenuRow
              Icon={Eye}
              label="Show database title"
              onClick={() => {
                onShowDatabaseTitle?.();
                close();
              }}
            />
          )}

          <Separator orientation="horizontal" className="sep" />

          <MenuRow
            Icon={DuplicateIcon}
            label="Duplicate"
            onClick={() => {
              onDuplicate?.();
              close();
            }}
          />
          {canDelete && (
            <MenuRow
              Icon={Trash2}
              label="Delete view"
              danger
              onClick={() => {
                onDelete?.();
                close();
              }}
            />
          )}
        </Card>
      </PopoverContent>
    </Popover>
  );
}
