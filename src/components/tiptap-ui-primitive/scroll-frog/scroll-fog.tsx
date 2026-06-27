import type { CSSProperties } from "react";
import "./scroll-fog.scss";

export interface ScrollFogProps {
  /** which edge of the scroll container to fade */
  edge: "top" | "bottom";
  /** fade height in px (default 28) */
  height?: number;
  /**
   * Solid color to fade from (toward transparent) — should match the scroll
   * container's background. If omitted, falls back to the inherited
   * `--scroll-fog-color`, which you can set on the scroll container instead of
   * passing this prop. With neither set it fades from transparent (a no-op).
   */
  color?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * A sticky gradient overlay that fades scrolling content into the container's
 * background at the top or bottom edge. Pulls itself out of flow with a
 * negative margin so it overlays rows instead of pushing them.
 *
 * The container should be the scroll region (position: relative if it isn't
 * already a positioned/scrolling box). Place <ScrollFog edge="top" /> as the
 * first child and/or <ScrollFog edge="bottom" /> as the last child.
 */
export function ScrollFog({
  edge,
  height = 28,
  color,
  className,
  style,
}: ScrollFogProps) {
  return (
    <div
      aria-hidden
      className={["scroll-fog", className].filter(Boolean).join(" ")}
      data-edge={edge}
      style={
        {
          "--scroll-fog-height": `${height}px`,
          ...(color ? { "--scroll-fog-color": color } : {}),
          ...style,
        } as CSSProperties
      }
    />
  );
}
