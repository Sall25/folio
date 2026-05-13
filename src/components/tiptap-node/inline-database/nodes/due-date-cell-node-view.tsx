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
import "./due-date-cell-node-view.scss";
import { useActiveViewType } from "../hooks/use-active-view-type";

export function DueDateCellNodeView({
  node,
  updateAttributes,
  editor,
  getPos,
}: NodeViewProps) {
  const dueDateAttrs = node.attrs as DateCellAttrs;

  const [date, setDate] = useState<Date | undefined>(
    dueDateAttrs.value ? new Date(dueDateAttrs.value) : undefined,
  );

  // Sync date back to node attrs when it changes
  function handleDateChange(d: Date) {
    setDate(d);
    updateAttributes({ value: d.toISOString() });
  }

  const activeViewType = useActiveViewType(editor, getPos);

  return (
    <NodeViewWrapper
      as={"div"}
      data-type="date-cell"
      style={{
        borderRight:
          activeViewType !== "table"
            ? "none"
            : "1px solid var(--tt-border-color)",
        height: "fit-content",
        margin: 0,
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
