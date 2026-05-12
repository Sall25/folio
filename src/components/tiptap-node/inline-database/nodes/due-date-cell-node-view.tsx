import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type { DateCellAttrs } from "../types/types";
import { formatDate } from "src/components/tiptap-ui/mention-menu/calendar-view/utils";
import CalendarView from "src/components/tiptap-ui/mention-menu/calendar-view/calendar-view";
import { useState } from "react";

export function DueDateCellNodeView({ node, updateAttributes }: NodeViewProps) {
  const dueDateAttrs = node.attrs as DateCellAttrs;

  const [date, setDate] = useState<Date | undefined>(
    dueDateAttrs.value ? new Date(dueDateAttrs.value) : undefined,
  );

  // Sync date back to node attrs when it changes
  function handleDateChange(d: Date) {
    setDate(d);
    updateAttributes({ value: d.toISOString() });
  }
  return (
    <NodeViewWrapper
      as={"div"}
      data-type="date-cell"
      style={{
        borderRight: "1px solid var(--tt-border-color)",
        height: "fit-content",
      }}
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            style={{ background: "transparent", width: "100%" }}
          >
            <span>{date ? formatDate(date) : ""}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <CalendarView value={date} onChange={handleDateChange} />
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}
