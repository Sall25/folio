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
  value: string | null;
  onChange?: (iso: string) => void;
  readonly?: boolean;
}

export function DateCellDisplay({
  value,
  onChange,
  readonly = false,
}: DateCellDisplayProps) {
  // Local draft only used while the popover is open
  const [draft, setDraft] = useState<Date | undefined>(
    value ? new Date(value) : undefined,
  );

  // Always derive the displayed date from the prop — stays in sync
  const date = value ? new Date(value) : new Date();

  function handleDateChange(d: Date) {
    setDraft(d);
    onChange?.(d.toISOString());
  }

  const trigger = (
    <Button
      variant="ghost"
      style={{
        background: "transparent",
        width: "100%",
        justifyContent: "flex-start",
        fontFamily:
          'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Display", "Segoe UI", Helvetica, Arial, sans-serif',
        fontSize: 15,
        fontWeight: 400,
        lineHeight: 1.6,
        color: "var(--tt-theme-text)",
      }}
    >
      <span>{formatDate(date)}</span>
    </Button>
  );

  if (readonly || !onChange) return trigger;

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent>
        <CalendarView value={draft ?? date} onChange={handleDateChange} />
      </PopoverContent>
    </Popover>
  );
}
