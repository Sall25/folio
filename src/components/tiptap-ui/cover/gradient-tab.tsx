import { GRADIENT_PRESETS } from "./gradient-presets";

interface GradientTabProps {
  selected: string | null;
  onSelect: (gradient: string) => void;
}

export function GradientTab({ selected, onSelect }: GradientTabProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "var(--tt-theme-muted)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Presets
      </span>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 6,
        }}
      >
        {GRADIENT_PRESETS.map((g) => {
          const isSelected = selected === g.value;
          return (
            <button
              key={g.value}
              title={g.label}
              onClick={() => onSelect(g.value)}
              style={{
                height: 40,
                borderRadius: 6,
                background: g.value,
                border: isSelected
                  ? "2.5px solid var(--tt-brand-color-500)"
                  : "2px solid transparent",
                cursor: "pointer",
                position: "relative",
                transition: "border-color 0.15s, transform 0.1s",
                transform: isSelected ? "scale(0.93)" : "scale(1)",
                minWidth: 50,
              }}
            >
              {isSelected && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 3,
                    right: 3,
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 0 0 1.5px rgba(0,0,0,0.25)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Live preview */}
      {selected && (
        <div
          style={{
            height: 80,
            borderRadius: 8,
            background: selected,
            marginTop: 4,
          }}
        />
      )}
    </div>
  );
}
