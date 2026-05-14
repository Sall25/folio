import { useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { formatDate } from "src/components/tiptap-ui/mention-menu/calendar-view/utils";
import CalendarView from "src/components/tiptap-ui/mention-menu/calendar-view/calendar-view";

interface DateCellDisplayProps {
  value: string | null; // ISO string
  onChange?: (iso: string) => void;
  readonly?: boolean;
}

export function DateCellDisplay({
  value,
  onChange,
  readonly = false,
}: DateCellDisplayProps) {
  const [date, setDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined,
  );

  function handleDateChange(d: Date) {
    setDate(d);
    onChange?.(d.toISOString());
  }

  const trigger = (
    <Button
      variant="ghost"
      style={{ background: "transparent", width: "100%" }}
    >
      <span>{date ? formatDate(date) : ""}</span>
    </Button>
  );

  if (readonly || !onChange) return trigger;

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent>
        <CalendarView value={date} onChange={handleDateChange} />
      </PopoverContent>
    </Popover>
  );
}
