import { forwardRef, type CSSProperties, type HTMLAttributes } from "react";
import { ICON_FAMILIES, type IconVariant } from "./icon-style";
import "./material-icon.scss";

// One Material Symbols glyph, drawn from the variable font
// (material-symbols/*.css, imported in main.tsx).
//
// It takes the same props as the line icons it replaces, so a call site only
// changes its import:
//   • size — the box, like an <svg>'s width attribute: CSS that sizes the
//     icon (.tiptap-button-icon …) still wins. The glyph fills the box.
//   • color — the glyph's colour (it follows currentColor otherwise).
//   • strokeWidth, absoluteStrokeWidth, fill, stroke — line-icon props, accepted
//     and ignored.
// filled, weight and variant override the app's icon style (icon-style.ts)
// for this icon only.
// The glyph's name is drawn from a data attribute, so it never shows up as
// text (copying, textContent, screen readers).

export interface MaterialIconProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "color"> {
  size?: number | string;
  color?: string;
  /** Filled or outlined. */
  filled?: boolean;
  /** The font's weight axis, 100–700. */
  weight?: number;
  /** Outlined, rounded or sharp. */
  variant?: IconVariant;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
  fill?: string;
  stroke?: string;
}

export const MaterialIcon = forwardRef<
  HTMLSpanElement,
  MaterialIconProps & { name: string }
>(function MaterialIcon(
  {
    name,
    size,
    color,
    filled,
    weight,
    variant,
    strokeWidth,
    absoluteStrokeWidth,
    fill,
    stroke,
    className,
    style,
    ...rest
  },
  ref,
) {
  void strokeWidth;
  void absoluteStrokeWidth;
  void fill;
  void stroke;

  const vars: Record<string, string> = {};
  if (size != null) {
    vars["--mi-size"] = typeof size === "number" ? `${size}px` : size;
  }
  if (filled != null) vars["--mi-fill"] = filled ? "1" : "0";
  if (weight != null) vars["--mi-wght"] = String(weight);
  if (variant) vars["--mi-family"] = `"${ICON_FAMILIES[variant]}"`;
  if (color) vars.color = color;

  return (
    <span
      ref={ref}
      className={className ? `material-icon ${className}` : "material-icon"}
      style={{ ...vars, ...style } as CSSProperties}
      aria-hidden={rest["aria-label"] != null ? undefined : true}
      {...rest}
    >
      <span className="material-icon__glyph" data-icon={name} />
    </span>
  );
});
