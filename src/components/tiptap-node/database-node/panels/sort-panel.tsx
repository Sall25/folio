import { PropSelect } from "./prop-select";
import type { Sort, Property } from "../types";

interface SortPanelProps {
  sorts: Sort[];
  properties: Property[];
  onAdd: () => void;
  onUpdate: (idx: number, patch: Partial<Sort>) => void;
  onRemove: (idx: number) => void;
}

export function SortPanel({
  sorts,
  properties,
  onAdd,
  onUpdate,
  onRemove,
}: SortPanelProps) {
  return (
    <div className="db-panel">
      <div className="db-panel-title">Sort</div>
      {sorts.length === 0 && (
        <p className="db-panel-empty">No sorts applied.</p>
      )}
      {sorts.map((s, i) => (
        <div key={i} className="db-panel-row">
          <PropSelect
            properties={properties}
            value={s.prop}
            onChange={(v) => onUpdate(i, { prop: v })}
          />
          <select
            className="db-select"
            value={s.dir}
            onChange={(e) =>
              onUpdate(i, { dir: e.target.value as "asc" | "desc" })
            }
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
          <button className="db-rm" onClick={() => onRemove(i)}>
            ✕
          </button>
        </div>
      ))}
      <button className="db-add-btn" onClick={onAdd}>
        + Add sort
      </button>
    </div>
  );
}
