import { Ellipsis } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { SelectionActionsMenu } from "../selection-actions-menu";
import type { Page, DatabaseProperty } from "src/types";

export function CardActionsMenu({
  record,
  properties,
  open,
  onOpenChange,
  onSetValue,
  onDelete,
  onDuplicate,
  onLayout,
  onPropertyVisibility,
  onOpenIn,
  lastEditedBy,
  lastEditedAt,
}: {
  record: Page;
  properties: DatabaseProperty[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSetValue: (propertyId: string, value: unknown) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onLayout?: () => void;
  onPropertyVisibility?: () => void;
  onOpenIn?: () => void;
  lastEditedBy?: string;
  lastEditedAt?: string;
}) {
  // Open-gated: when closed, render a plain trigger button and DON'T mount the
  // Radix Popover. Mount the popover only when open. Avoids the always-mounted
  // Radix machinery per card (matters on a board with many cards).
  if (!open) {
    return (
      <Button
        variant="ghost"
        className="db-card-controls__btn"
        tooltip="Actions"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(true);
        }}
      >
        <Ellipsis className="tiptap-button-icon" size={14} />
      </Button>
    );
  }

  return (
    <Popover open onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="db-card-controls__btn"
          tooltip="Actions"
          onClick={(e) => e.stopPropagation()}
        >
          <Ellipsis className="tiptap-button-icon" size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
      >
        <SelectionActionsMenu
          recordIds={[record.id]}
          properties={properties}
          onSetValue={onSetValue}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onLayout={onLayout}
          onPropertyVisibility={onPropertyVisibility}
          onOpenIn={onOpenIn}
          lastEditedBy={lastEditedBy}
          lastEditedAt={lastEditedAt}
          onClose={() => onOpenChange(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
