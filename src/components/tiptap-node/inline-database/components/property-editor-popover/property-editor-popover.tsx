/* eslint-disable @typescript-eslint/no-explicit-any */
// ─── PropertyEditorPopover ──────────────────────────────────────────────────
// The value editor for a picked property, as its own popover anchored to the •••
// button — the same treatment as IconPickerPopover. When a property is chosen in
// the actions menu, the menu closes and this opens in the menu's place (both
// anchor to the stable ••• trigger, which doesn't unmount when the menu closes).
//
// It renders EditPropertyValue, which reuses the generic <Cell> in editable mode
// — so each property type gets its real editor (status dropdown, select dropdown,
// text field, stars, date picker…) plus the "Edit property" footer.
//
// This is deliberately NOT CellEditorPopover: that one is purpose-built to anchor
// OVER a table cell (trigger = the cell, sideOffset -36). Here the editor is
// opened programmatically and anchored to an external element (•••), so it mirrors
// IconPickerPopover instead.
import type { RefObject } from "react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverPortal,
} from "src/components/tiptap-ui-primitive/popover";
import { EditPropertyValue } from "../edit-property-list/edit-property-value";
import type {
  CellValue,
  DatabaseProperty,
  DatabaseView,
  ID,
  Page,
} from "src/types";
import { Card } from "src/components/tiptap-ui-primitive/card";

export function PropertyEditorPopover({
  property,
  record,
  properties,
  view,
  columnValues,
  anchorRef,
  open,
  onOpenChange,
  onChange,
  onEditProperty,
  container,
}: {
  /** The property whose value is being edited. Null → nothing renders. */
  property: DatabaseProperty | null;
  record: Page;
  properties: DatabaseProperty[];
  view?: DatabaseView;
  columnValues?: CellValue[];
  /** Anchor the editor to this element (the ••• button). */
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: CellValue | null) => void;
  onEditProperty: (propertyId: ID) => void;
  container?: HTMLElement | null;
}) {
  if (!property) return null;

  const portalContainer =
    container ??
    (typeof document !== "undefined" ? document.getElementById("root") : null);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor virtualRef={anchorRef as any} />
      <PopoverPortal container={portalContainer}>
        <PopoverContent
          side="bottom"
          align="start"
          style={{ position: "fixed", zIndex: 999 }}
          className="db-property-editor__popover"
        >
          <Card style={{ padding: "5px 10px" }}>
            <EditPropertyValue
              property={property}
              record={record}
              properties={properties}
              view={view}
              columnValues={columnValues}
              onChange={onChange}
              onEditProperty={onEditProperty}
            />
          </Card>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}
