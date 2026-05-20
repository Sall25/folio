import { useState, useCallback } from "react";
import { formatDate, formatTime, parseTime } from "./utils";
import { CalendarHeader } from "./calendar-header";
import { CalendarGrid } from "./calendar-grid";
import { CalendarTimeInput } from "./calendar-time-input";
import { CalendarOptions } from "./calendar-options";

import "./calendar-view.scss";

export interface CalendarViewProps {
  value?: Date;
  onChange?: (date: Date) => void;
  remind?: string | null;
  onRemindChange?: (remind: string | null) => void;
  minDate?: Date;
  maxDate?: Date;
  includeTime?: boolean;
  onIncludeTimeChange?: (v: boolean) => void;
  dateFormat?: "relative" | "absolute";
  onDateFormatChange?: (format: "relative" | "absolute") => void;
  endDate?: Date | null;
  onEndDateChange?: (date: Date | null) => void;
}

export function CalendarView({
  value,
  onChange,
  minDate,
  maxDate,
  remind,
  onRemindChange,
  includeTime,
  onIncludeTimeChange,
  dateFormat,
  onDateFormatChange,
  endDate,
  onEndDateChange,
}: CalendarViewProps) {
  const today = new Date();
  const [anchor, setAnchor] = useState<Date>(value ?? today);
  const [selected, setSelected] = useState<Date | undefined>(value);
  const [timeInput, setTimeInput] = useState(() => {
    if (value && includeTime) return formatTime(value);
    return "12:00 PM";
  });
  const [selectingEnd, setSelectingEnd] = useState(false);

  const handleSelect = useCallback(
    (date: Date) => {
      if (endDate) {
        // range mode — move whichever boundary is closer
        const distToStart = selected
          ? Math.abs(date.getTime() - selected.getTime())
          : Infinity;
        const distToEnd = Math.abs(date.getTime() - endDate.getTime());

        if (distToEnd < distToStart) {
          // move end date
          if (date < (selected ?? date)) {
            // new end before start — swap
            onEndDateChange?.(selected!);
            setSelected(date);
            onChange?.(date);
          } else {
            onEndDateChange?.(date);
          }
        } else {
          // move start date (closer or equal distance)
          if (date > endDate) {
            // new start after end — swap
            setSelected(endDate);
            onChange?.(endDate);
            onEndDateChange?.(date);
          } else {
            setSelected(date);
            if (includeTime) setTimeInput(formatTime(date));
            onChange?.(date);
          }
        }
      } else if (selectingEnd) {
        // first end date selection
        if (selected && date < selected) {
          onEndDateChange?.(selected);
          setSelected(date);
          onChange?.(date);
        } else {
          onEndDateChange?.(date);
        }
        setSelectingEnd(false);
      } else {
        // normal start date selection
        setSelected(date);
        if (includeTime) setTimeInput(formatTime(date));
        onChange?.(date);
      }
    },
    [onChange, includeTime, endDate, selected, selectingEnd, onEndDateChange],
  );

  const handleTimeBlur = () => {
    const parsed = parseTime(timeInput);
    if (parsed && selected) {
      const newDate = new Date(selected);
      newDate.setHours(parsed.hours, parsed.minutes, 0, 0);
      setTimeInput(formatTime(newDate));
      onChange?.(newDate);
    } else if (selected) {
      setTimeInput(formatTime(selected));
    }
  };
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  return (
    <div className="cv">
      <div className="cv-input">
        <span>
          {selected
            ? includeTime
              ? formatDate(selected) + " " + timeInput
              : formatDate(selected)
            : "No date selected"}
        </span>
      </div>
      {selectingEnd && <div className="cv-hint">Click to select end date</div>}

      <CalendarHeader
        anchor={anchor}
        onPrev={() =>
          setAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
        }
        onNext={() =>
          setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
        }
        onToday={() => {
          setAnchor(today);
          handleSelect(today);
        }}
      />

      <CalendarGrid
        anchor={anchor}
        selected={selected}
        endDate={endDate ?? (selectingEnd ? hoverDate : null)}
        isSelectingEndDate={selectingEnd}
        minDate={minDate}
        maxDate={maxDate}
        onSelect={handleSelect}
        onHover={selectingEnd ? setHoverDate : undefined}
      />

      {includeTime && (
        <CalendarTimeInput
          value={timeInput}
          onChange={setTimeInput}
          onBlur={handleTimeBlur}
        />
      )}

      <CalendarOptions
        endDate={endDate}
        onEndDateToggle={(enabled) => {
          if (!enabled) {
            onEndDateChange?.(null);
            setSelectingEnd(false);
          } else {
            onEndDateChange?.(new Date());
          }
        }}
        dateFormat={dateFormat}
        onDateFormatChange={onDateFormatChange}
        includeTime={includeTime}
        onIncludeTimeChange={onIncludeTimeChange}
        remind={remind}
        onRemindChange={onRemindChange}
        onClear={() => setSelected(undefined)}
      />
    </div>
  );
}

export default CalendarView;
