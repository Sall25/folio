/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { useState, useSyncExternalStore, type RefObject } from "react";
import { recordSelection, subscribe } from "../../utils/record-selection-store";
import { useCardActions } from "../../context";
import { SelectionActionsMenu } from "../selection-actions-menu";
import { IconPickerPopover } from "src/components/tiptap-ui/cover";
import { PropertyEditorPopover } from "../property-editor-popover";
import type { ID } from "src/types";
import type { Target } from "src/components/tiptap-ui/cover/types";
import { MoveToPopover } from "../move-to-popover";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverPortal,
} from "src/components/tiptap-ui-primitive/popover";

function useHoveredRecordId(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => recordSelection.getHovered(),
    () => null,
  );
}

export function RecordDragMenu({
  onAction,
  anchorRef,
}: {
  onAction?: () => void;
  /** The drag grip button — the menu and its sub-popovers anchor here. */
  anchorRef: RefObject<HTMLElement | null>;
}) {
  const recordId = useHoveredRecordId();
  const actions = useCardActions();

  // The ACTIONS menu popover has its own open state, opened on mount. Closing it
  // (via run's onClose, or picking an item) does NOT unmount this component, so
  // the sub-popover state below survives.
  const [menuActionsOpen, setMenuActionsOpen] = useState(true);
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
    openInRecord: openRecordIn,
  } = actions;

  // Close the whole thing (finished an action): close the menu AND tell the drag
  // handle to unlock/close via onAction.
  const finish = () => {
    setMenuActionsOpen(false);
    onAction?.();
  };

  // Just close the actions menu popover, keeping THIS component mounted so a
  // sub-popover can open in its place.
  const closeMenuOnly = () => setMenuActionsOpen(false);

  const applyIcon = (name: string, color?: string, target?: Target) =>
    setRecordIcon(recordId, name, color, target);

  return (
    <>
      <Popover
        open={menuActionsOpen}
        onOpenChange={(o) => setMenuActionsOpen(o)}
      >
        <PopoverAnchor virtualRef={anchorRef as any} />
        <PopoverPortal container={document.getElementById("root")}>
          <PopoverContent
            side="right"
            align="start"
            sideOffset={6}
            onOpenAutoFocus={(e) => e.preventDefault()}
            style={{ zIndex: 999 }}
          >
            <SelectionActionsMenu
              recordIds={[recordId]}
              properties={properties}
              isFavorite={isFavorite(recordId)}
              onSetValue={(propertyId, value) =>
                setValue(recordId, propertyId, value)
              }
              onDelete={() => {
                deleteRecord(recordId);
                finish();
              }}
              onDuplicate={() => {
                duplicateRecord(recordId);
                finish();
              }}
              onAddToFavorites={() => toggleFavorite(recordId)}
              onLayout={() => {
                openLayout();
                finish();
              }}
              onPropertyVisibility={() => {
                openPropertyVisibility();
                finish();
              }}
              onOpenEditProperty={openEditProperty}
              onOpenIn={(mode) => {
                openRecordIn(recordId, mode);
                finish();
              }}
              // These open a sub-popover: close ONLY the actions menu (keep this
              // component mounted), then open the sub-popover.
              onEditIcon={() => {
                closeMenuOnly();
                setIconEditOpen(true);
              }}
              onPickProperty={(id) => {
                closeMenuOnly();
                setEditingPropertyId(id);
              }}
              onMoveTo={() => {
                closeMenuOnly();
                setMoveToOpen(true);
              }}
              // run() calls onClose after each handler; make it close only the
              // actions menu, NOT unmount this component.
              onClose={closeMenuOnly}
            />
          </PopoverContent>
        </PopoverPortal>
      </Popover>

      <IconPickerPopover
        open={iconEditOpen}
        onOpenChange={(o) => {
          if (!o) {
            setIconEditOpen(false);
            onAction?.();
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
            onAction?.();
          }
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
          if (!o) {
            setMoveToOpen(false);
            onAction?.();
          }
        }}
        anchorRef={anchorRef}
        currentPageId={recordId}
        onMove={(newParentId, category) =>
          moveRecord(recordId, newParentId, category)
        }
      />
    </>
  );
}
