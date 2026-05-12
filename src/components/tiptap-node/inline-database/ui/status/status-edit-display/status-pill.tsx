import type { StatusColor } from "./types";
import { getColor } from "./config";

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
  const c = getColor(color);
  return (
    <span
      className={`sp-pill ${className}`}
      style={{ background: c.bg, color: c.text }}
      onClick={onClick}
    >
      <span className="sp-pill-dot" style={{ background: c.dot }} />
      <span className="sp-pill-text">{name}</span>
    </span>
  );
}
