import { useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import {
  formatDate,
  formatTime,
} from "src/components/tiptap-ui/mention-menu/calendar-view/utils";
import CalendarView from "src/components/tiptap-ui/mention-menu/calendar-view/calendar-view";
import type { DateFormat, TimeFormat } from "src/types";

interface DateCellDisplayProps {
  value: string | null;
  format?: DateFormat;
  timeFormat?: TimeFormat;
  includeTime?: boolean;
  onChange?: (iso: string) => void;
  readonly?: boolean;
  placeholder?: string;
}

function formatForCell(
  date: Date,
  format: DateFormat,
  timeFormat: TimeFormat,
  includeTime: boolean,
): string {
  let base: string;
  switch (format) {
    case "iso":
      base = date.toISOString().slice(0, 10);
      break;
    case "short":
      base = date.toLocaleDateString(undefined, {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      });
      break;
    case "relative":
    case "full":
    default:
      base = formatDate(date);
  }
  if (includeTime) {
    base += " " + formatTime(date, timeFormat);
  }
  return base;
}

export function DateCellDisplay({
  value,
  format = "full",
  timeFormat = "12h",
  includeTime = false,
  onChange,
  readonly = false,
  placeholder = "Empty",
}: DateCellDisplayProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date | undefined>(
    value ? new Date(value) : undefined,
  );

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
        fontSize: 14,
        fontWeight: 400,
        lineHeight: 1.4,
        color: "var(--tt-text-cell)",
        minWidth: 100,
        minHeight: 34,
        margin: 0,
        padding: 0,
        paddingTop: 2,
      }}
    >
      <span
        className={`tiptap-button-text db-cell-text__display${
          value ? "" : " db-cell-text__display--empty"
        }`}
      >
        {value
          ? formatForCell(date, format, timeFormat, includeTime)
          : placeholder}
      </span>
    </Button>
  );

  if (readonly || !onChange) return trigger;

  if (!open) {
    return (
      <div
        role="button"
        tabIndex={0}
        style={{ display: "contents" }}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {trigger}
      </div>
    );
  }

  return (
    <Popover open onOpenChange={setOpen} defaultOpen>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent>
        <CalendarView
          value={draft ?? date}
          onChange={handleDateChange}
          includeTime={includeTime}
        />
      </PopoverContent>
    </Popover>
  );
}
