import type { ReactNode } from "react";
import { useDropdown } from "../context";

interface ContentProps {
  children: ReactNode;
  className?: string;
}

const defaultStyle = `absolute top-11 left-0 flex flex-col gap-3 z-50 py-2 px-2 min-w-45 
        rounded-lg bg-white shadow-xl shadow-neutral-100 text-neutral-600
      dark:bg-neutral-900 border dark:border-neutral-800
       dark:text-neutral-200 dark:shadow-neutral-950`;

export default function Content({ children, className = defaultStyle }: ContentProps) {
  const { open, cancelClose } = useDropdown();

  if (!open) return null;

  return (
    <div
      onMouseEnter={cancelClose}
      className={className}
    >
      {children}
    </div>
  )
}