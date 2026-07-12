import type {
  Page,
  CellValue,
  DatabaseProperty,
  CellValueMap,
} from "src/types";
import { useDataSource } from "src/hooks/use-data-sources";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage as patchPageApi } from "src/api/pages";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { SelectCellDisplay } from "src/components/tiptap-node/inline-database/primitives/select-cell-display";
import { StatusCellDisplay } from "src/components/tiptap-node/inline-database/primitives/status-cell-display";
import { CheckboxCellDisplay } from "src/components/tiptap-node/inline-database/primitives/checkbox-cell-display";
import { MultiSelectCellDisplay } from "src/components/tiptap-node/inline-database/primitives/multi-select-cell-display";
import { DateCellDisplay } from "src/components/tiptap-node/inline-database/primitives/date-cell-display";
import "./record-property-panel.scss";

export function RecordPropertyPanel({ page }: { page: Page }) {
  const { data: source } = useDataSource(page.sourceId);
  const patchPage = usePatchPage(({ id, patch }) => patchPageApi(id, patch));

  // not a row, or schema not loaded → nothing to show
  if (page.sourceId == null || page.values == null || !source) return null;

  const values = page.values;

  const updateCell = (propertyId: string, newValue: CellValue) => {
    patchPage.mutate({
      id: page.id,
      patch: { values: { ...values, [propertyId]: newValue } },
    });
  };

  const properties = source.properties.filter((p) => p.config.type !== "title");
  if (properties.length === 0) return null;

  return (
    <div className="record-prop-panel">
      {properties.map((prop) => (
        <PropertyRow
          key={prop.id}
          prop={prop}
          value={values[prop.id]}
          onChange={(v) => updateCell(prop.id, v)}
        />
      ))}
    </div>
  );
}

function PropertyRow({
  prop,
  value,
  onChange,
}: {
  prop: DatabaseProperty;
  value: CellValue;
  onChange: (v: CellValue) => void;
}) {
  // PROPERTY_TYPE_ICONS holds Material Symbols NAME STRINGS now — not icon
  // components — so it's rendered through DynamicIcon rather than as <Icon />.
  const iconName = PROPERTY_TYPE_ICONS[prop.config.type];

  const rendered = (() => {
    switch (prop.config.type) {
      case "select":
        return (
          <SelectCellDisplay
            value={value as CellValueMap["select"]}
            options={prop.config.options}
            onChange={onChange}
          />
        );
      case "status":
        return (
          <StatusCellDisplay
            value={value as CellValueMap["status"]}
            groups={prop.config.groups}
            onChange={(item) => onChange(item.id)}
          />
        );
      case "checkbox":
        return (
          <CheckboxCellDisplay
            value={(value as CellValueMap["checkbox"]) ?? false}
            onChange={() => onChange(!value)}
          />
        );
      case "multi_select":
        return (
          <MultiSelectCellDisplay
            value={(value as CellValueMap["multi_select"]) ?? []}
            options={prop.config.options}
            onChange={onChange}
          />
        );
      case "date":
      case "created_time":
      case "edited_time":
        return (
          <DateCellDisplay
            value={value as CellValueMap["date"]}
            onChange={onChange}
          />
        );

      // Plain-text-ish values. `text` was missing entirely, so text properties
      // fell through to `default: null` and the whole row was dropped — which
      // is why they never appeared in the panel at all.
      case "text":
      case "number":
      case "url":
      case "email":
      case "phone":
        return (
          <span className="record-prop-panel__value record-prop-panel__value--text">
            {(value as CellValueMap["phone"]) ?? "—"}
          </span>
        );

      default:
        return null;
    }
  })();

  if (!rendered) return null;

  return (
    <div className="record-prop-panel__row">
      <div className="record-prop-panel__label">
        <DynamicIcon
          name={iconName}
          size={20}
          filled={false}
          className="record-prop-panel__label-icon"
        />
        <span>{prop.name}</span>
      </div>
      <div className="record-prop-panel__value-wrapper">{rendered}</div>
    </div>
  );
}
