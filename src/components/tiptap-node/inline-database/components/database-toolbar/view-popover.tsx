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
import { useState } from "react";
import { ViewIcon } from "./view-icon";

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
}: ViewNamePopoverProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-active-state={active ? "on" : "off"}
          variant="ghost"
          style={{
            borderRadius: "var(--tt-radius-xl)",
            padding: "5px 15px",
          }}
        >
          <ViewIcon view={view} />
          <span className="tiptap-button-text">{view.name}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Card
          style={{
            padding: "5px 15px",
            boxShadow: "var(--tt-shadow-elevated-md)",
            minWidth: 220,
          }}
        >
          <Button
            variant="ghost"
            className="action-button"
            onClick={() => {
              onRename?.(true);
              setOpen(false);
            }}
            style={{ width: "100%", justifyContent: "flex-start" }}
          >
            <Edit className="tiptap-button-icon" />
            <span className="tiptap-button-text">Rename</span>
          </Button>
          <Button
            variant="ghost"
            className="action-button"
            onClick={() => {
              onEdit?.();
              setOpen(false);
            }}
            style={{ width: "100%", justifyContent: "flex-start" }}
          >
            <SlidersHorizontal className="tiptap-button-icon" />
            <span className="tiptap-button-text">Edit view</span>
          </Button>
          <Separator
            orientation="horizontal"
            className="sep"
            style={{ height: 0.5 }}
          />
          <Button
            variant="ghost"
            className="action-button"
            onClick={() => {
              onCopyLink?.();
              setOpen(false);
            }}
            style={{ width: "100%", justifyContent: "flex-start" }}
          >
            <Link className="tiptap-button-icon" />
            <span className="tiptap-button-text">Copy link to view</span>
          </Button>
          <Button
            variant="ghost"
            className="action-button"
            onClick={() => {
              onOpenAsFullPage?.();
              setOpen(false);
            }}
            style={{ width: "100%", justifyContent: "flex-start" }}
          >
            <Maximize2 className="tiptap-button-icon" />
            <span className="tiptap-button-text">Open as full page</span>
          </Button>
          {attrs.hideTitle && (
            <Button
              variant="ghost"
              className="action-button"
              onClick={() => {
                onShowDatabaseTitle?.();
                setOpen(false);
              }}
              style={{ width: "100%", justifyContent: "flex-start" }}
            >
              <Eye className="tiptap-button-icon" />
              <span className="tiptap-button-text">Show database title</span>
            </Button>
          )}
          <Separator orientation="horizontal" className="sep" />
          <Button
            variant="ghost"
            className="action-button"
            onClick={() => {
              onDuplicate?.();
              setOpen(false);
            }}
            style={{ width: "100%", justifyContent: "flex-start" }}
          >
            <DuplicateIcon className="tiptap-button-icon" />
            <span className="tiptap-button-text">Duplicate</span>
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              className="action-button action-button--danger"
              onClick={() => {
                onDelete?.();
                setOpen(false);
              }}
              style={{ width: "100%", justifyContent: "flex-start" }}
            >
              <Trash2 className="tiptap-button-icon" />
              <span className="tiptap-button-text">Delete view</span>
            </Button>
          )}
        </Card>
      </PopoverContent>
    </Popover>
  );
}
