import type { CSSProperties } from "react";

interface FolioLogoProps {
  /** Rendered size in px (width = height). Default 24. */
  size?: number;
  /**
   * Base brand color. The F stem uses it at full strength and the arm a
   * lighter mix, so the whole mark shifts with one value. Defaults to the
   * brand token, mixing cleanly wherever it's placed.
   */
  color?: string;
  /** Optional extra className on the root svg. */
  className?: string;
  style?: CSSProperties;
  /** Accessible label; omit (or "") to render decorative (aria-hidden). */
  title?: string;
}

/**
 * Folio mark — a rounded "ribbon" F: one continuous stem with a lighter arm.
 *
 * Both strokes derive from a single `color` via color-mix, so passing
 * `var(--tt-brand-color-400)` (the default) tints the entire mark and it mixes
 * cleanly with the brand token anywhere (sidebar chip, favicon, hero). The
 * heavy round caps keep it legible down to ~16px.
 */
export function FolioLogo({
  size = 24,
  color = "var(--tt-brand-color-400)",
  className,
  style,
  title,
}: FolioLogoProps) {
  const decorative = !title;

  const stem = color;
  const arm = `color-mix(in srgb, ${color} 55%, white)`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
    >
      {!decorative && <title>{title}</title>}
      {/* stem + top curve (the F spine) */}
      <path
        d="M13 34V12a5 5 0 0 1 5-5h11"
        stroke={stem}
        strokeWidth={4.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* middle arm (lighter) */}
      <path
        d="M13 20h12"
        stroke={arm}
        strokeWidth={4.6}
        strokeLinecap="round"
      />
    </svg>
  );
}
