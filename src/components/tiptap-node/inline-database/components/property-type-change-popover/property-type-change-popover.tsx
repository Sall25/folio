import { ArrowLeftRight } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { NavigableMenuItem } from "src/components/tiptap-node/inline-database/components/navigable-menu-item";
import "./property-type-change-popover.scss";

export function PropertyTypeChangePopover({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <NavigableMenuItem
      Icon={ArrowLeftRight}
      label="Change type"
      side="right"
      align="start"
      avoidCollisions
      collisionPadding={4}
    >
      <Card
        className="property-type-change-popover-card"
        style={{
          boxShadow: "var(--tt-shadow-elevated-md)",
          padding: "2px 10px",
          borderRadius: "var(--tt-radius-md)",
          border: "1px solid var(--tt-border-color)",
          maxHeight:
            "min(600px, var(--radix-popover-content-available-height))",
          scrollbarWidth: "thin",
          overflowY: "auto",
        }}
      >
        {children}
      </Card>
    </NavigableMenuItem>
  );
}
