import { ArrowLeftRight, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import "./property-type-change-popover.scss";

export function PropertyTypeChangePopover({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost">
          <ArrowLeftRight className="tiptap-button-icon" />
          <span className="tiptap-button-text">Change property type</span>
          <Spacer />
          <ChevronRight className="tiptap-button-icon-sub" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="center" asChild>
        <Card
          className="property-type-change-popover-card"
          style={{
            boxShadow: "var(--tt-shadow-elevated-sm)",
            padding: "2px 10px",
            borderRadius: "var(--tt-radius-md)",
            maxHeight: 500,
            scrollbarWidth: "thin",
            overflowY: "auto",
          }}
        >
          {children}
        </Card>
      </PopoverContent>
    </Popover>
  );
}
