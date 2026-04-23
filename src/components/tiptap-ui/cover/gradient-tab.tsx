import { GRADIENT_PRESETS } from "./gradient-presets";
import "./gradient-tab.scss";

interface GradientTabProps {
  selected: string | null;
  onSelect: (gradient: string) => void;
}

export function GradientTab({ selected, onSelect }: GradientTabProps) {
  return (
    <div className="gradient-tab">
      <span className="gradient-tab__label">Presets</span>

      <div className="gradient-tab__grid">
        {GRADIENT_PRESETS.map((g) => (
          <button
            key={g.value}
            title={g.label}
            onClick={() => onSelect(g.value)}
            className={`gradient-tab__swatch${selected === g.value ? " gradient-tab__swatch--selected" : ""}`}
            style={{ background: g.value }}
          />
        ))}
      </div>

      {selected && (
        <div
          className="gradient-tab__preview"
          style={{ background: selected }}
        />
      )}
    </div>
  );
}
