import { forwardRef } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "src/lib/tiptap-utils";

import "./chevron.scss";

export type ChevronSize = "small" | "default" | "large";

export type ChevronVariant = "ghost" | "subtle";

export interface ChevronProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  expanded?: boolean;
  size?: ChevronSize;
  variant?: ChevronVariant;
}

export const Chevron = forwardRef<HTMLButtonElement, ChevronProps>(
  (
    {
      expanded = false,
      className,
      size = "default",
      variant = "ghost",
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn("chevron", className)}
        data-expanded={expanded}
        data-size={size}
        data-variant={variant}
        aria-expanded={expanded}
        aria-label={ariaLabel ?? (expanded ? "Collapse" : "Expand")}
        {...props}
      >
        <ChevronRight strokeWidth={2} />
      </button>
    );
  },
);

Chevron.displayName = "Chevron";
