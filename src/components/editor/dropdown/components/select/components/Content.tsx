import type { ReactNode } from "react";
import { useSelect } from "../selectContext";

interface ContentProps {
  children: ReactNode;
  className?: string;
}

const defaultStyle = `absolute left-full -top-1
        translate-x-2.5
        flex flex-col items-center gap-1
        z-50 px-1 py-1 rounded-lg
        bg-white shadow shadow-neutral-200 text-neutral-600
        dark:bg-neutral-800/60 ring-1 dark:ring-neutral-800
         dark:text-neutral-200 dark:shadow-neutral-900`;

export default function Content({ children, className }: ContentProps) {
  const { open, cancelClose, scheduleClose } = useSelect();

  if (!open) return null;

  return (
    <div
      onMouseLeave={scheduleClose}
      onMouseEnter={cancelClose}
      className={className ? `${defaultStyle} ${className}` : `${defaultStyle}`}
    >
      {children}
    </div>
  );
}