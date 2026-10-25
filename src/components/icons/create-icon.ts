import {
  createElement,
  forwardRef,
  type ComponentType,
  type CSSProperties,
} from "react";
import { MaterialIcon, type MaterialIconProps } from "./material-icon";

export type IconProps = MaterialIconProps;

/** Any icon component: these, or Folio's own SVG icons (tiptap-icons).
 *  Typed by the props they all take, so lists of icons can mix them. */
export type IconComponent = ComponentType<{
  className?: string;
  style?: CSSProperties;
  size?: number;
  strokeWidth?: number | string;
  color?: string;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}>;

/** A named icon component for one Material Symbols glyph. `defaultSize` is
 *  the box when neither `size` nor CSS sets one (24, like line icons). */
export function createIcon(
  displayName: string,
  glyph: string,
  defaultSize?: number,
) {
  const Icon = forwardRef<HTMLSpanElement, MaterialIconProps>((props, ref) =>
    createElement(MaterialIcon, {
      size: defaultSize,
      ...props,
      name: glyph,
      ref,
    }),
  );
  Icon.displayName = displayName;
  return Icon;
}
