// ─── EditPropertyValue ──────────────────────────────────────────────────────
// The edit state for ONE property's value on the current record. It reuses the
// generic <Cell> in editable mode, so every property type gets its real editor
// for free: status → the status dropdown, select → the select dropdown, text →
// a text input, rating → stars, date → the date picker, etc. — the same editors
// the table/board cells use. No per-type branching here; Cell dispatches by
// config.type.
//
// A footer "Edit property" opens the property CONFIG panel (edit the property
// itself, not its value) — the distinction the second screenshot shows.
import { Settings2 } from "lucide-react";
import { Cell } from "../cells/cell";
import { MenuRow } from "../menu-row";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import type {
  CellValue,
  DatabaseProperty,
  DatabaseView,
  ID,
  Page,
} from "src/types";

export function EditPropertyValue({
  property,
  record,
  properties,
  view,
  columnValues,
  onChange,
  onEditProperty,
}: {
  property: DatabaseProperty;
  record: Page;
  properties: DatabaseProperty[];
  view?: DatabaseView;
  columnValues?: CellValue[];
  /** Set this record's value for the property. */
  onChange: (value: CellValue | null) => void;
  /** Open the property CONFIG (edit the property itself, not its value). */
  onEditProperty: (propertyId: ID) => void;
}) {
  const value =
    property.config.type === "title"
      ? ((record.title ?? "") as unknown as CellValue)
      : ((record.values?.[property.id] ?? null) as CellValue | null);

  return (
    <div className="db-edit-property-value">
      {/* The real editor for this property type, editable (readonly=false). */}
      <Cell
        property={property}
        properties={properties}
        value={value}
        record={record}
        view={view}
        columnValues={columnValues}
        onChange={onChange}
        readonly={false}
        unwrapped
      />

      <Separator orientation="horizontal" />

      {/* Edit the PROPERTY itself (config), not the value. */}
      <MenuRow
        Icon={Settings2}
        label="Edit property"
        onClick={() => onEditProperty(property.id)}
      />
    </div>
  );
}
