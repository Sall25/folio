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

type DateCellValue = string | { start: string; end?: string } | null;

interface DateCellDisplayProps {
  value: DateCellValue;
  format?: DateFormat;
  timeFormat?: TimeFormat;
  includeTime?: boolean;
  onChange?: (value: DateCellValue) => void;
  readonly?: boolean;
  placeholder?: string;
}

function normalize(value: DateCellValue): {
  start: Date | null;
  end: Date | null;
} {
  if (value == null) return { start: null, end: null };
  if (typeof value === "string") {
    const d = new Date(value);
    return { start: isNaN(d.getTime()) ? null : d, end: null };
  }
  const start = value.start ? new Date(value.start) : null;
  const end = value.end ? new Date(value.end) : null;
  return {
    start: start && !isNaN(start.getTime()) ? start : null,
    end: end && !isNaN(end.getTime()) ? end : null,
  };
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

  const { start, end } = normalize(value);
  const [draft, setDraft] = useState<Date | undefined>(start ?? undefined);

  const displayDate = start ?? new Date();

  function handleDateChange(d: Date) {
    setDraft(d);
    // Editing via the calendar picker sets/moves the START date only,
    // preserving an existing end (e.g. set via timeline resize) rather than
    // silently dropping it. A plain string is only written when there was
    // never an end to begin with, so simple (non-range) date properties keep
    // their original storage shape instead of turning into objects.
    if (end) {
      onChange?.({ start: d.toISOString(), end: end.toISOString() });
    } else {
      onChange?.(d.toISOString());
    }
  }

  const displayText = start
    ? end && end.getTime() !== start.getTime()
      ? `${formatForCell(start, format, timeFormat, includeTime)} → ${formatForCell(end, format, timeFormat, includeTime)}`
      : formatForCell(start, format, timeFormat, includeTime)
    : placeholder;

  const trigger = (
    <Button
      variant="ghost"
      style={{
        background: "transparent",
        width: "100%",
        justifyContent: "flex-start",
        fontSize: "inherit",
        fontWeight: 400,
        lineHeight: "inherit",
        color: "var(--tt-text-cell)",
        minWidth: 100,
        minHeight: "inherit",
        height: "inherit",
        margin: 0,
        padding: 0,
      }}
    >
      <span
        className={`tiptap-button-text db-cell-text__display${
          start ? "" : " db-cell-text__display--empty"
        }`}
        style={{ lineHeight: "inherit" }}
      >
        {displayText}
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
          value={draft ?? displayDate}
          onChange={handleDateChange}
          includeTime={includeTime}
        />
      </PopoverContent>
    </Popover>
  );
}
