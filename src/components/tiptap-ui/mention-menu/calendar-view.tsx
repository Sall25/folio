import { useState, useCallback } from "react";
import "./calendar-view.scss";

const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells: Date[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push(new Date(year, month - 1, daysInPrev - i));
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push(new Date(year, month, i));
  }
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push(new Date(year, month + 1, i));
  }
  return cells;
}

function formatDate(date: Date) {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

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
}: CalendarViewProps) {
  const REMIND_OPTIONS = [
    { value: null, label: "None" },
    { value: "on_day", label: "On the day" },
    { value: "1_day_before", label: "1 day before" },
    { value: "2_days_before", label: "2 days before" },
    { value: "1_week_before", label: "1 week before" },
  ];

  const [remindOpen, setRemindOpen] = useState(false);
  const currentRemind = REMIND_OPTIONS.find((o) => o.value === remind);
  // state for dropdown
  const [formatOpen, setFormatOpen] = useState(false);

  const today = new Date();
  const [anchor, setAnchor] = useState<Date>(value ?? today);
  const [selected, setSelected] = useState<Date | undefined>(value);
  const [endDate, setEndDate] = useState(false);

  const [time, setTime] = useState(() => {
    if (value) {
      const h = value.getHours().toString().padStart(2, "0");
      const m = value.getMinutes().toString().padStart(2, "0");
      return `${h}:${m}`;
    }
    return "12:00";
  });

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(":").map(Number);
    setTime(e.target.value);
    if (selected) {
      const newDate = new Date(selected);
      newDate.setHours(hours, minutes, 0, 0);
      onChange?.(newDate);
    }
  };
  const handleSelect = useCallback(
    (date: Date) => {
      setSelected(date);
      onChange?.(date);
    },
    [onChange],
  );

  const navigatePrev = () =>
    setAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));

  const navigateNext = () =>
    setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const goToToday = () => {
    setAnchor(today);
    handleSelect(today);
  };

  const cells = getMonthGrid(anchor.getFullYear(), anchor.getMonth());

  return (
    <div className="cv">
      {/* Date input */}
      <div className="cv-input">
        <span>
          {selected
            ? includeTime
              ? selected.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }) +
                " " +
                time
              : formatDate(selected)
            : "No date selected"}
        </span>
      </div>

      {/* Header */}
      <div className="cv-header">
        <span className="cv-header__label">
          {MONTHS_FULL[anchor.getMonth()]} {anchor.getFullYear()}
        </span>
        <div className="cv-header__right">
          <button className="cv-today-btn" onClick={goToToday}>
            Today
          </button>
          <button
            className="cv-nav__btn"
            onClick={navigatePrev}
            aria-label="Previous"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M9 2L4 7L9 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            className="cv-nav__btn"
            onClick={navigateNext}
            aria-label="Next"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M5 2L10 7L5 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="cv-day-labels">
        {DAYS_SHORT.map((d) => (
          <span key={d} className="cv-day-label">
            {d}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="cv-grid">
        {cells.map((date, i) => {
          const isCurrentMonth = date.getMonth() === anchor.getMonth();
          const isSelected = !!selected && isSameDay(date, selected);
          const isToday = isSameDay(date, today);
          const disabled =
            (minDate && date < minDate) || (maxDate && date > maxDate);

          return (
            <button
              key={i}
              type="button"
              className="cv-day"
              data-current-month={isCurrentMonth || undefined}
              data-selected={isSelected || undefined}
              data-today={isToday || undefined}
              data-disabled={disabled || undefined}
              onClick={disabled ? undefined : () => handleSelect(date)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {includeTime && (
        <div className="cv-time">
          <input
            type="time"
            className="cv-time__input"
            value={time}
            onChange={handleTimeChange}
          />
        </div>
      )}

      {/* Options */}
      <div className="cv-options">
        <div className="cv-option">
          <span>End date</span>
          <button
            className={`cv-toggle ${endDate ? "cv-toggle--on" : ""}`}
            onClick={() => setEndDate((v) => !v)}
            aria-label="Toggle end date"
          >
            <span className="cv-toggle__thumb" />
          </button>
        </div>

        <div
          className="cv-option cv-option--chevron"
          onClick={() => setFormatOpen((v) => !v)}
        >
          <span>Date format</span>
          <span className="cv-option__value">
            {dateFormat === "relative" ? "Relative" : "Absolute"}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M4 5l2 2 2-2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>

        {formatOpen && (
          <div className="cv-remind-options">
            {(["relative", "absolute"] as const).map((fmt) => (
              <button
                key={fmt}
                className={`cv-remind-option ${dateFormat === fmt ? "cv-remind-option--active" : ""}`}
                onClick={() => {
                  onDateFormatChange?.(fmt);
                  setFormatOpen(false);
                }}
              >
                {fmt === "relative" ? "Relative" : "Absolute"}
              </button>
            ))}
          </div>
        )}

        <div className="cv-option">
          <span>Include time</span>
          <button
            className={`cv-toggle ${includeTime ? "cv-toggle--on" : ""}`}
            onClick={() => onIncludeTimeChange?.(!includeTime)}
            aria-label="Toggle include time"
          >
            <span className="cv-toggle__thumb" />
          </button>
        </div>

        <div
          className="cv-option cv-option--chevron"
          onClick={() => setRemindOpen((v) => !v)}
        >
          <span>Remind</span>
          <span className="cv-option__value">
            {currentRemind?.label ?? "None"}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M4 5l2 2 2-2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>

        {remindOpen && (
          <div className="cv-remind-options">
            {REMIND_OPTIONS.map((opt) => (
              <button
                key={String(opt.value)}
                className={`cv-remind-option ${remind === opt.value ? "cv-remind-option--active" : ""}`}
                onClick={() => {
                  onRemindChange?.(opt.value);
                  setRemindOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <button className="cv-clear" onClick={() => setSelected(undefined)}>
          Clear
        </button>

        <div className="cv-learn">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1" />
            <text
              x="7"
              y="10.5"
              textAnchor="middle"
              fontSize="9"
              fill="currentColor"
            >
              ?
            </text>
          </svg>
          <span>Learn about reminders</span>
        </div>
      </div>
    </div>
  );
}

export default CalendarView;
