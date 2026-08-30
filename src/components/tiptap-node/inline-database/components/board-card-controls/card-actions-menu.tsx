import { Ellipsis } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { SelectionActionsMenu } from "../selection-actions-menu";
import type { ID, Page } from "src/types";
import { useCardActions } from "../../context";
import { useRef, useState } from "react";
import { IconPickerPopover } from "src/components/tiptap-ui/cover";
import type { Target } from "src/components/tiptap-ui/cover/types";
import { PropertyEditorPopover } from "../property-editor-popover";

export function CardActionsMenu({
  record,
  open,
  onOpenChange,
  onPreventClose,
  lastEditedBy,
  lastEditedAt,
}: {
  record: Page;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPreventClose?: (o: boolean) => void;
  lastEditedBy?: string;
  lastEditedAt?: string;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [iconEditOpen, setIconEditOpen] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<ID | null>(null);

  const cardActions = useCardActions();
  if (!cardActions) return null;

  const {
    properties,
    openEditProperty,
    /*openEditProperty,*/ openLayout,
    openPropertyVisibility,
    /* getRecord, isFavorite,*/ toggleFavorite,
    setValue,
    deleteRecord,
    duplicateRecord,
    moveRecord,
    isFavorite: isFavoriteFn,
    setRecordIcon,
    openInRecord,
  } = cardActions;
  const isFavorite = isFavoriteFn(record.id);

  const applyIcon = (
    name: string,
    color?: string | undefined,
    target?: Target | undefined,
  ) => {
    setRecordIcon(record.id, name, color, target);
  };

  // Open-gated: when closed, render a plain trigger button and DON'T mount the
  // Radix Popover. Mount the popover only when open. Avoids the always-mounted
  // Radix machinery per card (matters on a board with many cards).
  if (!open) {
    return (
      <>
        <Button
          variant="ghost"
          size="small"
          className="db-card-controls__btn"
          tooltip="Actions"
          ref={anchorRef}
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(true);
          }}
        >
          <Ellipsis className="tiptap-button-icon" size={14} />
        </Button>
        <IconPickerPopover
          open={iconEditOpen}
          onOpenChange={(o) => {
            if (!o) {
              setIconEditOpen(false);
              onPreventClose?.(false);
            }
          }}
          anchorRef={anchorRef}
          onSelect={applyIcon}
        />
        <PropertyEditorPopover
          open={editingPropertyId !== null}
          onOpenChange={(o) => {
            if (!o) {
              setEditingPropertyId(null);
              onPreventClose?.(false);
            }
          }}
          anchorRef={anchorRef}
          property={properties.find((p) => p.id === editingPropertyId) ?? null}
          record={record}
          properties={properties}
          onChange={(v) => setValue(record.id, editingPropertyId!, v)}
          onEditProperty={(id) => openEditProperty(id)}
        />
      </>
    );
  }

  return (
    <Popover open onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="small"
          className="db-card-controls__btn"
          tooltip="Actions"
          onClick={(e) => e.stopPropagation()}
        >
          <Ellipsis className="tiptap-button-icon" size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverPortal container={document.getElementById("root")}>
        <PopoverContent
          side="right"
          align="center"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onFocusOutside={(e) => e.preventDefault()}
          style={{ zIndex: 999 }}
        >
          <SelectionActionsMenu
            recordIds={[record.id]}
            properties={properties}
            onSetValue={(propertyId, value) =>
              setValue(record.id, propertyId, value)
            }
            onDelete={() => deleteRecord(record.id)}
            onDuplicate={() => duplicateRecord(record.id)}
            onAddToFavorites={() => toggleFavorite(record.id)}
            onLayout={openLayout}
            onPropertyVisibility={openPropertyVisibility}
            onOpenEditProperty={openEditProperty}
            onEditIcon={() => {
              onPreventClose?.(true);
              setIconEditOpen(true);
            }}
            onMoveTo={moveRecord}
            lastEditedBy={lastEditedBy}
            lastEditedAt={lastEditedAt}
            onClose={() => onOpenChange(false)}
            isFavorite={isFavorite}
            onPickProperty={(id) => {
              onPreventClose?.(true);
              setEditingPropertyId(id);
            }}
            onOpenIn={(mode) => openInRecord(record.id, mode)}
          />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}
