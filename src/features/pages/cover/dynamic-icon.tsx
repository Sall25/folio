import { memo } from "react";
import { MaterialIcon } from "src/components/icons";
import { resolveIconName } from "./icon-name";
import "./dynamic-icon.scss";

// A page or property icon by name. The name is resolved in ./icon-name
// (older names map to their Material glyph, unknown ones to the default).
function DynamicIconImpl({
  name,
  size = 16,
  className,
  style,
  weight,
  filled,
}: {
  name?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  weight?: number;
  filled?: boolean;
}) {
  return (
    <MaterialIcon
      name={resolveIconName(name)}
      size={size}
      weight={weight}
      filled={filled}
      className={["dynamic-icon", className].filter(Boolean).join(" ")}
      style={style}
    />
  );
}

export const DynamicIcon = memo(DynamicIconImpl);
