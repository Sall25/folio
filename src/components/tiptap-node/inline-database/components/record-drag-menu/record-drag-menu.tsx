// ─── RecordDragMenu ─────────────────────────────────────────────────────────
// Shows the SAME rich record menu on table/list drag-handle rows that
// board/gallery cards get. The drag handle publishes the hovered databaseRecord
// id to recordSelection; Menu (on a "Record" target) delegates here.
//
// This runs INSIDE the drag-handle menu, which is portaled to document.body —
// OUTSIDE the DatabaseProvider tree. So it reads handlers via useCardActions(),
// which falls back to the module store (published by CardActionsProvider) when
// context isn't reachable across the portal. That's the whole reason the store
// exists.
//
// The •••-anchored sub-popovers (icon picker, property editor, move-to) anchor
// to THIS menu's own container (there is no ••• button here), mirroring
// CardActionsMenu's behaviour.
import { useRef, useState, useSyncExternalStore } from "react";
import { recordSelection, subscribe } from "../../utils/record-selection-store";
import { useCardActions } from "../../context";
import { SelectionActionsMenu } from "../selection-actions-menu";
import { IconPickerPopover } from "src/components/tiptap-ui/cover";
import { PropertyEditorPopover } from "../property-editor-popover";
import type { ID } from "src/types";
import type { Target } from "src/components/tiptap-ui/cover/types";
import { MoveToPopover } from "../move-to-popover";

function useHoveredRecordId(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => recordSelection.getHovered(),
    () => null,
  );
}

export function RecordDragMenu({ onAction }: { onAction?: () => void }) {
  const recordId = useHoveredRecordId();
  const actions = useCardActions();

  const anchorRef = useRef<HTMLDivElement>(null);
  const [iconEditOpen, setIconEditOpen] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<ID | null>(null);
  const [moveToOpen, setMoveToOpen] = useState(false);

  if (!recordId || !actions) return null;

  const record = actions.getRecord(recordId);
  if (!record) return null;

  const {
    properties,
    setValue,
    deleteRecord,
    duplicateRecord,
    toggleFavorite,
    isFavorite,
    moveRecord,
    setRecordIcon,
    openLayout,
    openPropertyVisibility,
    openEditProperty,
    openInRecord,
  } = actions;

  const close = () => onAction?.();

  const applyIcon = (name: string, color?: string, target?: Target) =>
    setRecordIcon(recordId, name, color, target);

  return (
    <div ref={anchorRef} className="db-record-drag-menu">
      <SelectionActionsMenu
        recordIds={[recordId]}
        properties={properties}
        isFavorite={isFavorite(recordId)}
        onSetValue={(propertyId, value) =>
          setValue(recordId, propertyId, value)
        }
        onDelete={() => {
          deleteRecord(recordId);
          close();
        }}
        onDuplicate={() => {
          duplicateRecord(recordId);
          close();
        }}
        onAddToFavorites={() => toggleFavorite(recordId)}
        onLayout={() => {
          openLayout();
          close();
        }}
        onPropertyVisibility={() => {
          openPropertyVisibility();
          close();
        }}
        onOpenEditProperty={openEditProperty}
        onOpenIn={(mode) => {
          openInRecord(recordId, mode);
          close();
        }}
        onEditIcon={() => setIconEditOpen(true)}
        onPickProperty={(id) => setEditingPropertyId(id)}
        onMoveTo={() => setMoveToOpen(true)}
        onClose={close}
      />

      {/* •••-anchored sub-popovers — anchored to this menu's container. */}
      <IconPickerPopover
        open={iconEditOpen}
        onOpenChange={(o) => {
          if (!o) setIconEditOpen(false);
        }}
        anchorRef={anchorRef}
        onSelect={applyIcon}
      />
      <PropertyEditorPopover
        open={editingPropertyId !== null}
        onOpenChange={(o) => {
          if (!o) setEditingPropertyId(null);
        }}
        anchorRef={anchorRef}
        property={properties.find((p) => p.id === editingPropertyId) ?? null}
        record={record}
        properties={properties}
        onChange={(v) =>
          editingPropertyId != null && setValue(recordId, editingPropertyId, v)
        }
        onEditProperty={(id) => openEditProperty(id)}
      />
      <MoveToPopover
        open={moveToOpen}
        onOpenChange={(o) => {
          if (!o) setMoveToOpen(false);
        }}
        anchorRef={anchorRef}
        currentPageId={recordId}
        onMove={(newParentId, category) =>
          moveRecord(recordId, newParentId, category)
        }
      />
    </div>
  );
}
