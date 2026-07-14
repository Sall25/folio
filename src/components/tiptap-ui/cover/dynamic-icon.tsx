import { useEffect, useState } from "react";
import "./dynamic-icon.scss";

type DynamicIconProps = {
  /** Material Symbols name, e.g. "home", "chevron_right", "favorite". */
  name: string;
  /** px size — also drives the optical-size axis. */
  size?: number;
  /** Filled (Notion look) vs outlined. */
  filled?: boolean;
  /** Stroke weight, 100–700. */
  weight?: number;
} & React.HTMLAttributes<HTMLSpanElement>;

// Module-level: the font loads ONCE for the whole app, so every icon can share
// the result. Without this each DynamicIcon would run its own check.
let fontReady = false;
const listeners = new Set<() => void>();

if (typeof document !== "undefined" && "fonts" in document) {
  document.fonts
    .load('24px "Material Symbols Rounded"')
    .then(() => {
      fontReady = true;
      listeners.forEach((fn) => fn());
      listeners.clear();
    })
    .catch(() => {
      // Font failed — show the glyphs anyway rather than hiding them forever.
      fontReady = true;
      listeners.forEach((fn) => fn());
      listeners.clear();
    });
}

function useFontReady(): boolean {
  const [ready, setReady] = useState(fontReady);
  useEffect(() => {
    if (fontReady) return;
    const fn = () => setReady(true);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return ready;
}

export const DynamicIcon = ({
  name,
  size = 24,
  filled = true,
  weight = 400,
  className,
  style,
  ...props
}: DynamicIconProps) => {
  const opsz = Math.min(48, Math.max(20, size));
  const ready = useFontReady();

  return (
    <span
      className={`material-symbols-rounded${className ? ` ${className}` : ""}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${opsz}`,
        // The glyph is a LIGATURE — until the font loads, the browser renders
        // the literal name ("home") in a fallback face. Reserve the box but hide
        // the text, so there's no flash of the icon's name and no layout shift
        // when it resolves.
        width: size,
        height: size,
        visibility: ready ? undefined : "hidden",
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
};
