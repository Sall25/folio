"use client";

import { forwardRef } from "react";
import { cn } from "src/lib/tiptap-utils";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import "./list.scss";

// ─── List ─────────────────────────────────────────────────────────────────────

export interface ListProps extends React.HTMLAttributes<HTMLDivElement> {
  showLines?: boolean;
  spacing?: "compact" | "normal" | "relaxed";
}

const List = forwardRef<HTMLDivElement, ListProps>(
  (
    { className, showLines = true, spacing = "normal", children, ...props },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn("tiptap-list", className)}
        data-spacing={spacing}
        data-show-lines={showLines}
        {...props}
      >
        {children}
      </div>
    );
  },
);
List.displayName = "List";
// ─── ListItem ─────────────────────────────────────────────────────────────────

export interface ListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  showLine?: boolean;
}

const ListItem = forwardRef<HTMLDivElement, ListItemProps>(
  ({ className, showLine, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("tiptap-list-item", className)} {...props}>
        <div className="tiptap-list-item__content">{children}</div>
        {showLine !== false && (
          <Separator
            orientation="horizontal"
            className="tiptap-list-item__separator"
            decorative
          />
        )}
      </div>
    );
  },
);
ListItem.displayName = "ListItem";

export { List, ListItem };
