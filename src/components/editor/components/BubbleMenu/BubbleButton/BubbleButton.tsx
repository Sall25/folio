import type { PropsWithChildren } from "react";

interface ButtonProps {
  children: PropsWithChildren['children'];
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function BubbleButton({
  children,
  active = false,
  onClick,
  className = 'bubble-button'
}: ButtonProps) {
  return (
    <span
      onMouseDown={(e) => {
        e.preventDefault(); // keep editor focus
        onClick?.()
      }}
      className={`${className} ${active ? 'active' : ''}`}
    >
      {children}
    </span>
  );
}

