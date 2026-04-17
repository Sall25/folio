import type { Property } from "../types";

interface PropSelectProps {
  properties: Property[];
  value: string;
  onChange: (v: string) => void;
}

export const PropSelect = ({
  properties,
  value,
  onChange,
}: PropSelectProps) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="db-select"
  >
    {properties.map((p) => (
      <option key={p.id} value={p.id}>
        {p.label}
      </option>
    ))}
  </select>
);
