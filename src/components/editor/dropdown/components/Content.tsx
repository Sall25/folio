import { type ReactNode } from "react";
interface ContentProps {
  children: ReactNode;
  className?: string;
}

const defaultStyle = `flex flex-col gap-3 z-50 py-2 px-2 min-w-45 
        rounded-lg bg-white shadow-xl shadow-neutral-100 text-neutral-600
      dark:bg-neutral-900 border dark:border-neutral-800
       dark:text-neutral-200 dark:shadow-neutral-950`;

export default function Content({ children, className = defaultStyle }: ContentProps) {

  return (
    <div
      className={className}
    >
      {children}
    </div>
  );
}