import type { ReactNode } from "react";

interface ItemProps {
  children: ReactNode;
  onSelect?: () => void;
  active?: boolean;
}

export default function Item({ children, onSelect, active }: ItemProps) {

  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect?.();
      }}
      className={`text-sm flex gap-1 items-center
       hover:bg-neutral-100
      dark:hover:bg-neutral-800 rounded px-2 py-1
      ${active ? 'text-cyan-600' : 'dark:text-neutral-200'}
      `}
    >
      {children}
    </button>
  );
}