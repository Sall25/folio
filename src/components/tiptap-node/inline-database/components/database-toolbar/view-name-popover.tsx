import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type { DatabaseView } from "../../types/types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { Edit, Eye, Link, Maximize2, SlidersHorizontal } from "lucide-react";

import "./view-name-popover.scss";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { DuplicateIcon } from "src/components/tiptap-icons/duplicate-icon";
import { useState } from "react";

interface ViewNamePopoverProps {
  view: DatabaseView;
  onRename?: () => void;
  onEdit?: () => void;
  onCopyLink?: () => void;
  onOpenAsFullPage?: () => void;
  onShowDatabaseTitle?: () => void;
  onDuplicate?: () => void;
}

export function ViewNamePopover({
  view,
  onRename,
  onEdit,
  onCopyLink,
  onOpenAsFullPage,
  onShowDatabaseTitle,
  onDuplicate,
}: ViewNamePopoverProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          style={{ borderRadius: "var(--tt-radius-sm)", padding: "5px 1px" }}
        >
          <span className="tiptap-button-text">{view.name}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Card style={{ padding: "5px 10px" }}>
          <Button
            variant="ghost"
            className="action-button"
            onClick={() => {
              onRename?.();
              setOpen(!open);
            }}
          >
            <Edit className="tiptap-button-icon" />
            <span className="tiptap-button-text">Rename</span>
          </Button>
          <Button
            variant="ghost"
            className="action-button"
            onClick={() => {
              onEdit?.();
              setOpen(!open);
            }}
          >
            <SlidersHorizontal className="tiptap-button-icon" />
            <span className="tiptap-button-text">Edit view</span>
          </Button>
          <Separator orientation="horizontal" className="sep" />
          <Button
            variant="ghost"
            className="action-button"
            onClick={() => {
              onCopyLink?.();
              setOpen(!open);
            }}
          >
            <Link className="tiptap-button-icon" />
            <span className="tiptap-button-text">Copy link to view</span>
          </Button>
          <Button
            variant="ghost"
            className="action-button"
            onClick={() => {
              onOpenAsFullPage?.();
              setOpen(!open);
            }}
          >
            <Maximize2 className="tiptap-button-icon" />
            <span className="tiptap-button-text">Open as full page</span>
          </Button>
          <Button
            variant="ghost"
            className="action-button"
            onClick={() => {
              onShowDatabaseTitle?.();
              setOpen(!open);
            }}
          >
            <Eye className="tiptap-button-icon" />
            <span className="tiptap-button-text">Show database title</span>
          </Button>
          <Separator orientation="horizontal" className="sep" />
          <Button
            variant="ghost"
            className="action-button"
            onClick={() => {
              onDuplicate?.();
              setOpen(!open);
            }}
          >
            <DuplicateIcon className="tiptap-button-icon" />
            <span className="tiptap-button-text">Duplicate</span>
          </Button>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
