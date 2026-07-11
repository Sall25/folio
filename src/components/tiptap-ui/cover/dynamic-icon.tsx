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
  return (
    <span
      className={`material-symbols-rounded${className ? ` ${className}` : ""}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${opsz}`,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
};
