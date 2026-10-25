import { memo } from "react";
import { MaterialIcon } from "src/components/icons";
import { splitIconName } from "src/components/icons/icon-style";
import { resolveIconName } from "./icon-name";
import "./dynamic-icon.scss";

// A page or property icon by name. The name is resolved in ./icon-name
// (older names map to their Material glyph, unknown ones to the default).
// A look picked for this icon in the icon picker ("…;fill:0;weight:600")
// comes before the props; anything not set follows the app's icon style.
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
  const { override } = splitIconName(name ?? "");
  return (
    <MaterialIcon
      name={resolveIconName(name)}
      size={size}
      weight={override.weight ?? weight}
      filled={override.filled ?? filled}
      variant={override.variant}
      className={["dynamic-icon", className].filter(Boolean).join(" ")}
      style={style}
    />
  );
}

export const DynamicIcon = memo(DynamicIconImpl);
