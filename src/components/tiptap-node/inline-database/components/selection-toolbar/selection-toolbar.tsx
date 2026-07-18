import { useState } from "react";
import { Trash2, Ellipsis, X } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import type { DatabaseProperty } from "src/types";
import { recordSelection } from "../../utils/record-selection-store";
import "./selection-toolbar.scss";
import { SelectionActionsMenu } from "../selection-actions-menu";
import { Separator } from "src/components/tiptap-ui-primitive/separator";

/**
 * Bulk-action bar shown while records are selected.
 *
 * The property row is DISPLAY ONLY — it summarises which properties the
 * selection carries. Every mutation lives behind the ellipsis menu, which
 * navigates main → property → values with its own local panel state.
 *
 * That stack is deliberately local rather than db.pushPanel: the shared stack
 * is already driven by the view-options menu and the property header, and a
 * third consumer would collide with them.
 *
 * `recordIds` must be the VISIBLE selection (selection ∩ sortedRecordIds) —
 * selection survives filter changes, so a record can stay selected while
 * filtered out, and bulk actions must only touch what the user can see.
 */
export function SelectionToolbar({
  databaseId,
  recordIds,
  properties,
  onSetValue,
  onDelete,
  onDuplicate,
}: {
  databaseId: string;
  recordIds: string[];
  properties: DatabaseProperty[];
  onSetValue: (propertyId: string, value: unknown) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  if (recordIds.length === 0) return null;

  return (
    <Card
      className="db-selection-toolbar"
      contentEditable={false}
      // Keep clicks inside the bar away from the row drag-select handler.
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <CardItemGroup orientation="horizontal">
        <span className="db-selection-toolbar__count">
          {recordIds.length} selected
        </span>

        {/* ── Display only: which properties these records carry ─────────── */}
        <div className="db-selection-toolbar__props">
          {properties.map((prop) => (
            <span key={prop.id} style={{ display: "contents" }}>
              <Separator orientation="vertical" />
              <span className="db-selection-toolbar__prop" title={prop.name}>
                <DynamicIcon
                  name={PROPERTY_TYPE_ICONS[prop.config.type]}
                  size={16}
                  filled={false}
                  className="tiptap-button-icon"
                />
                <span className="db-selection-toolbar__prop-name">
                  {prop.name}
                </span>
              </span>
            </span>
          ))}
        </div>

        <Separator orientation="vertical" />

        <Button
          variant="ghost"
          tooltip="Delete records"
          onClick={() => {
            onDelete();
            recordSelection.clear(databaseId);
          }}
        >
          <Trash2 className="tiptap-button-icon" size={16} />
        </Button>

        <Separator orientation="vertical" />

        {/* ── All editing lives here ─────────────────────────────────────── */}
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
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
              onClose={() => setMenuOpen(false)}
            />
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" />

        <Button
          variant="ghost"
          tooltip="Clear selection"
          onClick={() => recordSelection.clear(databaseId)}
        >
          <X className="tiptap-button-icon" size={16} />
        </Button>
      </CardItemGroup>
    </Card>
  );
}
