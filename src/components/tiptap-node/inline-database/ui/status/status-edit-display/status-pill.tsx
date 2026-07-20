import type { StatusColor } from "./types";

interface StatusPillProps {
  name: string;
  color: StatusColor;
  onClick?: () => void;
  className?: string;
}

export function StatusPill({
  name,
  color,
  onClick,
  className = "",
}: StatusPillProps) {
  return (
    <span
      className={`status-badge status-badge--${color} ${className}`}
      onClick={onClick}
    >
      <span className="status-badge__dot" />
      <span className="status-badge__label">{name}</span>
    </span>
  );
}
