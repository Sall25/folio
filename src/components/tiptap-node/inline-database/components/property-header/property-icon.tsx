/**
 * Resolves a property's icon and renders it. A custom `iconName` is resolved
 * lazily via DynamicIcon (which loads the lucide namespace on demand, out of
 * boot); with no custom name we render the type's fallback icon directly.
 */

import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";

const ULTIMATE_FALLBACK_ICON = "category"; // Material Symbols name

/**
 * Resolves a property's icon and renders it. A custom `iconName` (a Material
 * Symbols ligature) wins when set; otherwise the property type's fallback name
 * is used. A bad/unknown custom name renders a blank glyph rather than the
 * fallback — acceptable, and the font handles it without forcing anything.
 */
export function PropertyIcon({
  iconName,
  fallback,
  color,
  style,
  ...rest
}: {
  iconName?: string;
  fallback: string; // Material Symbols name for this property type
  color?: string;
} & Omit<React.ComponentProps<typeof DynamicIcon>, "name">) {
  const name = iconName || fallback || ULTIMATE_FALLBACK_ICON;
  return (
    <DynamicIcon
      name={name}
      style={color ? { color, ...style } : style}
      {...rest}
    />
  );
}
