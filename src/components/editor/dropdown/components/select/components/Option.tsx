import type { ReactNode } from "react";

interface OptionProps {
  children: ReactNode;
  onSelect?: () => void;
  active?: boolean;
}

export default function Option({ children, onSelect, active }: OptionProps) {

  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect?.()
      }}

      className={` 
        w-full
        flex flex-col items-start
        px-2 py-1 rounded-lg
        text-sm text-left
         
        hover:bg-neutral-100 dark:hover:bg-neutral-800
        ${active ? 'text-cyan-600' : 'text-neutral-600 dark:text-neutral-200'}
      `}
    >
      {children}
    </button>
  )
}