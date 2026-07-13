// One colour vocabulary for every coloured pill in the database (select,
// multi-select, status).
//
// WHY NAMES, NOT VALUES
//
// SelectOption.color used to store a raw CSS var string, e.g.
// "var(--tt-color-highlight-blue)". That value alone can't produce a legible
// pill: the highlight tokens are pale in light mode but MID-TONES in dark mode,
// and there's no way in CSS to get from --tt-color-highlight-blue to its
// matching --tt-color-text-blue. So a coloured label on a highlight fill has
// almost no contrast in dark mode — exactly the bug the status badges hit.
//
// Storing the NAME ("blue") lets a pill derive BOTH halves from ONE token:
// --tt-color-text-blue is the ink, and a low-alpha mix of it is the fill. That
// behaves identically in both themes because it's one token, not two that only
// happen to pair up in one of them.
//
// MIGRATION
//
// Old rows still hold var strings, so normalizeColor() accepts either form and
// always returns a name. Nothing is rewritten destructively — existing options
// keep working, and anything saved from now on is stored as a name.

export const PILL_COLORS = [
  "gray",
  "brown",
  "orange",
  "yellow",
  "lime",
  "green",
  "mint",
  "teal",
  "cyan",
  "blue",
  "slate",
  "indigo",
  "purple",
  "violet",
  "magenta",
  "pink",
  "rose",
  "red",
] as const;

export type PillColor = (typeof PILL_COLORS)[number];

const PILL_COLOR_SET = new Set<string>(PILL_COLORS);

/**
 * Accepts any of:
 *   - a name:            "blue"
 *   - a highlight var:   "var(--tt-color-highlight-blue)"   (legacy stored form)
 *   - a text var:        "var(--tt-color-text-blue)"
 *   - anything unknown / null
 * and always returns a valid PillColor. Unknown input falls back to "gray"
 * rather than producing a class that matches no rule (which would render an
 * unstyled pill).
 */
export function normalizeColor(color: string | null | undefined): PillColor {
  if (!color) return "gray";

  const match = color.match(/--tt-color-(?:highlight|text)-([a-z]+)/);
  const name = (match ? match[1] : color).trim().toLowerCase();

  return PILL_COLOR_SET.has(name) ? (name as PillColor) : "gray";
}

/** The class pair for a coloured pill: `select-badge select-badge--blue`. */
export function pillClass(base: string, color: string | null | undefined) {
  return `${base} ${base}--${normalizeColor(color)}`;
}
