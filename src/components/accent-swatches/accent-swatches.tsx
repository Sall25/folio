import { useTranslation } from "react-i18next";
import { Check, Plus } from "src/components/icons";
import "./accent-swatches.scss";

/** The colours offered for a workspace or teamspace accent. */
export const ACCENT_COLORS = [
  "#6B4EFF", // violet
  "#2F80ED", // blue
  "#0EA5A4", // teal
  "#16A34A", // green
  "#CA8A04", // yellow
  "#EA580C", // orange
  "#E11D48", // red
  "#DB2777", // pink
  "#9333EA", // purple
  "#64748B", // slate
] as const;

const isPreset = (c: string) =>
  ACCENT_COLORS.some((p) => p.toLowerCase() === c.toLowerCase());

interface AccentSwatchesProps {
  /** The chosen colour; null = automatic. */
  value: string | null;
  onChange: (color: string | null) => void;
  /** What "automatic" means here ("Folio purple", "Match icon"). */
  autoLabel: string;
  disabled?: boolean;
}

/**
 * A row of colour swatches: "automatic" (no colour chosen), the presets,
 * and a custom colour from the browser's colour picker. Used for the
 * workspace's and a teamspace's accent.
 */
export function AccentSwatches({
  value,
  onChange,
  autoLabel,
  disabled = false,
}: AccentSwatchesProps) {
  const { t } = useTranslation();
  // A chosen colour that isn't a preset came from the custom picker.
  const custom = value && !isPreset(value) ? value : null;

  return (
    <div
      className="accent-swatches"
      role="radiogroup"
      aria-disabled={disabled || undefined}
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        aria-label={autoLabel}
        title={autoLabel}
        className="accent-swatch accent-swatch--auto"
        disabled={disabled}
        onClick={() => onChange(null)}
      >
        A
      </button>

      {ACCENT_COLORS.map((c) => {
        const selected = value?.toLowerCase() === c.toLowerCase();
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c}
            title={c}
            className="accent-swatch"
            style={{ "--swatch": c } as React.CSSProperties}
            disabled={disabled}
            onClick={() => onChange(c)}
          >
            {selected && <Check size={12} strokeWidth={3} aria-hidden />}
          </button>
        );
      })}

      {/* The label opens the hidden colour input; the input reports the
          colour as the user drags in the picker. */}
      <label
        className={`accent-swatch accent-swatch--custom${custom ? " is-set" : ""}`}
        style={
          custom ? ({ "--swatch": custom } as React.CSSProperties) : undefined
        }
        title={t("accentSwatches.custom", "Custom colour")}
        aria-checked={!!custom}
        role="radio"
        aria-disabled={disabled || undefined}
      >
        <input
          type="color"
          className="accent-swatch__input"
          value={custom ?? value ?? ACCENT_COLORS[0]}
          disabled={disabled}
          aria-label={t("accentSwatches.custom", "Custom colour")}
          onChange={(e) => onChange(e.target.value)}
        />
        {custom ? (
          <Check size={12} strokeWidth={3} aria-hidden />
        ) : (
          <Plus size={13} aria-hidden />
        )}
      </label>
    </div>
  );
}
