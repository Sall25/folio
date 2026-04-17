import { PropSelect } from "./prop-select";
import type { Filter, Property, FilterOperator } from "../types";

interface FilterPanelProps {
  filters: Filter[];
  properties: Property[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Filter>) => void;
  onRemove: (id: string) => void;
}

export function FilterPanel({
  filters,
  properties,
  onAdd,
  onUpdate,
  onRemove,
}: FilterPanelProps) {
  const OPS: { value: FilterOperator; label: string }[] = [
    { value: "contains", label: "contains" },
    { value: "is", label: "is" },
    { value: "is_not", label: "is not" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ];
  const noVal = (op: FilterOperator) =>
    op === "is_empty" || op === "is_not_empty";

  return (
    <div className="db-panel">
      <div className="db-panel-title">Filters</div>
      {filters.length === 0 && (
        <p className="db-panel-empty">No filters applied.</p>
      )}
      {filters.map((f) => (
        <div key={f.id} className="db-panel-row">
          <PropSelect
            properties={properties}
            value={f.prop}
            onChange={(v) => onUpdate(f.id, { prop: v })}
          />
          <select
            className="db-select"
            value={f.op}
            onChange={(e) =>
              onUpdate(f.id, { op: e.target.value as FilterOperator })
            }
          >
            {OPS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {!noVal(f.op) && (
            <input
              className="db-input"
              value={f.val}
              placeholder="value"
              onChange={(e) => onUpdate(f.id, { val: e.target.value })}
            />
          )}
          <button className="db-rm" onClick={() => onRemove(f.id)}>
            ✕
          </button>
        </div>
      ))}
      <button className="db-add-btn" onClick={onAdd}>
        + Add filter
      </button>
    </div>
  );
}
