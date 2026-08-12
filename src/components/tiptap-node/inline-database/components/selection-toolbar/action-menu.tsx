import { Ellipsis } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type { DatabaseProperty, ID } from "src/types";
import { SelectionActionsMenu } from "../selection-actions-menu";
import { memo } from "react";

interface ActionsMenuProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recordIds: ID[];
  properties: DatabaseProperty[];
  onSetValue: (propertyId: ID, value: unknown) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

function ActionMenuImpl({
  open,
  onOpenChange,
  recordIds,
  properties,
  onSetValue,
  onDelete,
  onDuplicate,
}: ActionsMenuProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" tooltip="Actions">
          <Ellipsis className="tiptap-button-icon" size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end">
        <SelectionActionsMenu
          recordIds={recordIds}
          properties={properties}
          onSetValue={onSetValue}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onClose={() => onOpenChange(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

export const ActionMenu = memo(ActionMenuImpl);
