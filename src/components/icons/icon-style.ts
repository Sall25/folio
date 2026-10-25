import { useEffect } from "react";
import { useLocalStorage } from "src/hooks/use-local-storage";
import { readStorage, type StorageCodec } from "src/lib/local-storage";

// How icons look, at two levels:
//   • everyone's own choice for the whole app (My settings), kept on this
//     device and applied as CSS variables on <html> (material-icon.scss);
//   • one page icon's own look, picked in the icon picker. It travels inside
//     the stored icon name, so every place that draws the icon shows it, with
//     no extra field to carry around:
//       "description"                         → the app's style
//       "description;style:rounded;fill:0"    → rounded, outlined
//       "description;weight:600"              → bold

export type IconVariant = "outlined" | "rounded" | "sharp";

export interface IconStyle {
  variant: IconVariant;
  filled: boolean;
  weight: number;
}

export type IconOverride = Partial<IconStyle>;

export const ICON_VARIANTS: readonly IconVariant[] = [
  "outlined",
  "rounded",
  "sharp",
];
export const ICON_WEIGHTS: readonly number[] = [200, 300, 400, 600];

export const ICON_FAMILIES: Record<IconVariant, string> = {
  outlined: "Material Symbols Outlined",
  rounded: "Material Symbols Rounded",
  sharp: "Material Symbols Sharp",
};

export const DEFAULT_ICON_STYLE: IconStyle = {
  variant: "outlined",
  filled: true,
  weight: 300,
};

export const ICON_STYLE_KEY = "folio-icon-style";

const isVariant = (v: unknown): v is IconVariant =>
  typeof v === "string" && (ICON_VARIANTS as readonly string[]).includes(v);
const isWeight = (v: unknown): v is number =>
  typeof v === "number" && v >= 100 && v <= 700;

const codec: StorageCodec<IconStyle> = {
  serialize: (v) => JSON.stringify(v),
  deserialize: (raw) => {
    const v = JSON.parse(raw) as Partial<IconStyle>;
    return {
      variant: isVariant(v.variant) ? v.variant : DEFAULT_ICON_STYLE.variant,
      filled:
        typeof v.filled === "boolean" ? v.filled : DEFAULT_ICON_STYLE.filled,
      weight: isWeight(v.weight) ? v.weight : DEFAULT_ICON_STYLE.weight,
    };
  },
};

/** The app's icon style on this device. */
export function useIconStyle() {
  return useLocalStorage<IconStyle>(ICON_STYLE_KEY, DEFAULT_ICON_STYLE, codec);
}

/** Puts a style on <html> as the icons' CSS variables. */
export function applyIconStyle(style: IconStyle) {
  if (typeof document === "undefined") return;
  const root = document.documentElement.style;
  root.setProperty("--mi-family", `"${ICON_FAMILIES[style.variant]}"`);
  root.setProperty("--mi-fill", style.filled ? "1" : "0");
  root.setProperty("--mi-wght", String(style.weight));
}

/** Before the first render (main.tsx), so icons don't change after load. */
export function applyStoredIconStyle() {
  applyIconStyle(readStorage(ICON_STYLE_KEY, DEFAULT_ICON_STYLE, codec));
}

/** Keeps <html> in step with the setting (mounted once, in the app shell). */
export function useApplyIconStyle() {
  const [style] = useIconStyle();
  useEffect(() => applyIconStyle(style), [style]);
}

// ── One icon's own look, inside its name ───────────────────────────────────

/** "description;style:rounded;fill:0" → the glyph and its own settings. */
export function splitIconName(name: string): {
  glyph: string;
  override: IconOverride;
} {
  const [glyph, ...parts] = name.split(";");
  const override: IconOverride = {};
  for (const part of parts) {
    const [key, value] = part.split(":");
    if (key === "style" && isVariant(value)) override.variant = value;
    else if (key === "fill" && (value === "0" || value === "1"))
      override.filled = value === "1";
    else if (key === "weight" && isWeight(Number(value)))
      override.weight = Number(value);
  }
  return { glyph, override };
}

/** The glyph with its own settings added (none → just the glyph). */
export function joinIconName(glyph: string, override: IconOverride): string {
  const parts = [glyph];
  if (override.variant) parts.push(`style:${override.variant}`);
  if (override.filled !== undefined)
    parts.push(`fill:${override.filled ? 1 : 0}`);
  if (override.weight !== undefined) parts.push(`weight:${override.weight}`);
  return parts.join(";");
}
