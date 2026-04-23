import { getMonthGrid, DAYS_SHORT, isSameDay } from "./utils";

interface CalendarGridProps {
  anchor: Date;
  endDate?: Date | null;
  isSelectingEndDate?: boolean;
  selected?: Date;
  minDate?: Date;
  maxDate?: Date;
  onSelect: (date: Date) => void;
  onHover?: (date: Date | null) => void;
}

export function CalendarGrid({
  anchor,
  endDate,
  selected,
  minDate,
  maxDate,
  onSelect,
  onHover,
}: CalendarGridProps) {
  const today = new Date();
  const cells = getMonthGrid(anchor.getFullYear(), anchor.getMonth());

  return (
    <>
      <div className="cv-day-labels">
        {DAYS_SHORT.map((d) => (
          <span key={d} className="cv-day-label">
            {d}
          </span>
        ))}
      </div>
      <div className="cv-grid">
        {cells.map((date, i) => {
          const isCurrentMonth = date.getMonth() === anchor.getMonth();
          const isSelected = !!selected && isSameDay(date, selected);
          const isToday = isSameDay(date, today);
          const disabled =
            (minDate && date < minDate) || (maxDate && date > maxDate);
          const isInRange =
            !!selected && !!endDate && date > selected && date < endDate;
          const isRangeStart =
            !!selected && !!endDate && isSameDay(date, selected); // ← only when endDate exists
          const isRangeEnd = !!endDate && isSameDay(date, endDate);

          return (
            <button
              key={i}
              type="button"
              className="cv-day"
              data-current-month={isCurrentMonth || undefined}
              data-today={isToday || undefined}
              data-disabled={disabled || undefined}
              data-in-range={isInRange || undefined}
              data-selected={(isSelected && !endDate) || undefined} // ← only when no range
              data-range-start={isRangeStart || undefined}
              data-range-end={isRangeEnd || undefined}
              onClick={disabled ? undefined : () => onSelect(date)}
              onMouseEnter={() => onHover?.(date)}
              onMouseLeave={() => onHover?.(null)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </>
  );
}
