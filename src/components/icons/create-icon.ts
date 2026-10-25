import { createElement, forwardRef } from "react";
import { MaterialIcon, type MaterialIconProps } from "./material-icon";

export type IconProps = MaterialIconProps;
export type IconComponent = ReturnType<typeof createIcon>;

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
