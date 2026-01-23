import type React from "react";
import type { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  active?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export default function Button({
  children,
  active,
  disabled,
  onClick,
  className = "",
  style
}: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center
        px-2.5 py-1 rounded-lg
        text-sm font-medium
        transition-all duration-150 ease-out
        select-none

        ${active
          ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
          : "text-neutral-600 dark:text-neutral-300"}

        ${!disabled && !active && `
          hover:bg-neutral-200/70
          dark:hover:bg-neutral-700/70
        `}

        ${disabled && `
          opacity-40 cursor-not-allowed
        `}

        focus:outline-none focus-visible:ring-2
        focus-visible:ring-cyan-500/50
        focus-visible:ring-offset-1
        dark:focus-visible:ring-offset-neutral-900

        ${className}
      `}
      style={style}
    >
      {children}
    </button>
  );
}
