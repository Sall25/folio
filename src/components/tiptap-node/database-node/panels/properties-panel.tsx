import type { Property } from "../types";

// ─── PropertiesPanel ──────────────────────────────────────────────────────
interface PropertiesPanelProps {
  properties: Property[];
  onToggle: (id: string) => void;
}

export function PropertiesPanel({
  properties,
  onToggle,
}: PropertiesPanelProps) {
  return (
    <div className="db-panel">
      <div className="db-panel-title">Visible properties</div>
      <div className="db-props-grid">
        {properties.map((p) => (
          <button
            key={p.id}
            className={`db-prop-pill ${p.visible ? "db-prop-pill--on" : ""}`}
            onClick={() => onToggle(p.id)}
          >
            {p.visible ? "✓ " : ""}
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
