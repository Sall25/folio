import { useState, useCallback } from "react";
import "./calendar-view.scss";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "month" | "week";

export interface CalendarViewProps {
  value?: Date;
  onChange?: (date: Date) => void;
  /** Earliest selectable date */
  minDate?: Date;
  /** Latest selectable date */
  maxDate?: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
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

function isDisabled(date: Date, minDate?: Date, maxDate?: Date) {
  if (minDate && date < minDate) return true;
  if (maxDate && date > maxDate) return true;
  return false;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: Date[] = [];

  // Leading days from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push(new Date(year, month - 1, daysInPrev - i));
  }
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push(new Date(year, month, i));
  }
  // Trailing days to fill 6 rows (42 cells)
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push(new Date(year, month + 1, i));
  }

  return cells;
}

function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

function DayCell({
  date,
  isCurrentMonth,
  isSelected,
  isToday,
  isDisabled,
  onClick,
}: DayCellProps) {
  return (
    <Button
      variant="ghost"
      type="button"
      className="cv-day"
      data-current-month={isCurrentMonth || undefined}
      data-active-state={isSelected || undefined}
      data-selected={isSelected || undefined}
      data-today={isToday || undefined}
      data-disabled={isDisabled || undefined}
      onClick={isDisabled ? undefined : onClick}
      tabIndex={isDisabled ? -1 : 0}
      aria-label={date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}
      aria-pressed={isSelected}
      aria-disabled={isDisabled}
    >
      <span className="cv-day__number">{date.getDate()}</span>
    </Button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CalendarView({
  value,
  onChange,
  minDate,
  maxDate,
}: CalendarViewProps) {
  const today = new Date();
  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState<Date>(value ?? today);
  const [selected, setSelected] = useState<Date | undefined>(value);

  const handleSelect = useCallback(
    (date: Date) => {
      setSelected(date);
      onChange?.(date);
    },
    [onChange],
  );

  // ── Navigation ──────────────────────────────────────────────────────────────

  const navigatePrev = () => {
    if (view === "month") {
      setAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    } else {
      setAnchor((d) => addDays(d, -7));
    }
  };

  const navigateNext = () => {
    if (view === "month") {
      setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    } else {
      setAnchor((d) => addDays(d, 7));
    }
  };

  const goToToday = () => {
    setAnchor(today);
    handleSelect(today);
  };

  // ── Header label ────────────────────────────────────────────────────────────

  const headerLabel =
    view === "month"
      ? `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
      : (() => {
          const week = getWeekDays(anchor);
          const start = week[0];
          const end = week[6];
          if (start.getMonth() === end.getMonth()) {
            return `${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
          }
          return `${MONTHS[start.getMonth()]} – ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
        })();

  // ── Render ──────────────────────────────────────────────────────────────────

  const monthCells =
    view === "month"
      ? getMonthGrid(anchor.getFullYear(), anchor.getMonth())
      : [];
  const weekCells = view === "week" ? getWeekDays(anchor) : [];

  return (
    <div className="cv" role="application" aria-label="Date picker">
      {/* ── Top bar ── */}
      <div className="cv-header">
        <div className="cv-header__left">
          <span className="cv-header__label">{headerLabel}</span>
          <button type="button" className="cv-today-btn" onClick={goToToday}>
            Today
          </button>
        </div>

        <div className="cv-header__right">
          {/* View toggle */}
          <ButtonGroup
            orientation="horizontal"
            className="cv-view-toggle"
            role="group"
            aria-label="Calendar view"
          >
            <Button
              type="button"
              variant="ghost"
              className="cv-view-toggle__btn"
              data-active={view === "month" || undefined}
              onClick={() => setView("month")}
            >
              Month
            </Button>
            <Button
              type="button"
              className="cv-view-toggle__btn"
              data-active={view === "week" || undefined}
              onClick={() => setView("week")}
            >
              Week
            </Button>
          </ButtonGroup>

          {/* Navigation */}
          <ButtonGroup
            orientation="horizontal"
            className="cv-nav"
            role="group"
            aria-label="Navigate"
          >
            <Button
              variant="ghost"
              type="button"
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
            </Button>
            <Button
              variant="ghost"
              type="button"
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
            </Button>
          </ButtonGroup>
        </div>
      </div>

      {/* ── Day labels ── */}
      <div className="cv-day-labels">
        {DAYS_SHORT.map((d) => (
          <span key={d} className="cv-day-label">
            {d}
          </span>
        ))}
      </div>

      {/* ── Month grid ── */}
      {view === "month" && (
        <div className="cv-grid cv-grid--month">
          {monthCells.map((date, i) => (
            <DayCell
              key={i}
              date={date}
              isCurrentMonth={date.getMonth() === anchor.getMonth()}
              isSelected={!!selected && isSameDay(date, selected)}
              isToday={isSameDay(date, today)}
              isDisabled={isDisabled(date, minDate, maxDate)}
              onClick={() => handleSelect(date)}
            />
          ))}
        </div>
      )}

      {/* ── Week row ── */}
      {view === "week" && (
        <div className="cv-grid cv-grid--week">
          {weekCells.map((date, i) => (
            <DayCell
              key={i}
              date={date}
              isCurrentMonth={date.getMonth() === anchor.getMonth()}
              isSelected={!!selected && isSameDay(date, selected)}
              isToday={isSameDay(date, today)}
              isDisabled={isDisabled(date, minDate, maxDate)}
              onClick={() => handleSelect(date)}
            />
          ))}
        </div>
      )}

      {/* ── Footer ── */}
      {selected && (
        <div className="cv-footer">
          <span className="cv-footer__selected">
            {selected.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            className="cv-footer__clear"
            onClick={() => {
              setSelected(undefined);
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

export default CalendarView;
