import type { Property } from "../types";

// ─── GroupPanel ───────────────────────────────────────────────────────────

interface GroupPanelProps {
  groupBy: string | null;
  properties: Property[];
  onChange: (prop: string | null) => void;
}

export function GroupPanel({ groupBy, properties, onChange }: GroupPanelProps) {
  return (
    <div className="db-panel">
      <div className="db-panel-title">Group by</div>
      <div className="db-panel-row">
        <label className="db-label">Field</label>
        <select
          className="db-select"
          value={groupBy ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : e.target.value)
          }
        >
          <option value="">(none)</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
