import type { ReactNode } from "react";

interface ItemProps {
  children: ReactNode;
  className?: string;
  onSelect?: () => void;
}

export default function Item({ children, onSelect, className = 'inline-block' }: ItemProps) {
  return (
    <button
      className={className}
      onMouseDown={onSelect}
    >
      {children}
    </button>
  );
}