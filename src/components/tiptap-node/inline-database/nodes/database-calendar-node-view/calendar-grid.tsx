import { NodeViewContent } from "@tiptap/react";
import { CalendarCell } from "./calendar-cell";
import { CalendarLanes } from "./calendar-lanes";
import { memo } from "react";
import { useCalendarViewState } from "../../context/calendar-view-context";

function toISODate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function CalendarGridImpl({ weekHeights }: { weekHeights: number[] }) {
  const { firstDow, daysInMonth, totalCells, today, year, month } =
    useCalendarViewState();

  return (
    <div
      className="db-calendar__grid"
      style={{
        gridTemplateRows: weekHeights.map((height) => `${height}px`).join(" "),
      }}
    >
      <CalendarLanes />

      {Array.from({ length: totalCells }).map((_, index) => {
        const row = Math.floor(index / 7);
        const column = index % 7;

        const dayNum = index - firstDow + 1;

        const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;

        const isToday =
          isCurrentMonth &&
          dayNum === today.getDate() &&
          month === today.getMonth() &&
          year === today.getFullYear();

        return (
          <CalendarCell
            key={index}
            dayNum={dayNum}
            isCurrentMonth={isCurrentMonth}
            isToday={isToday}
            date={isCurrentMonth ? toISODate(year, month, dayNum) : undefined}
            style={{
              gridColumn: column + 1,
              gridRow: row + 1,
              backgroundColor:
                column === 0 || column === 6
                  ? "var(--calendar-column-highlight)"
                  : "transparent",
              borderRight:
                column === 0 ? "1px solid var(--tt-border-color)" : undefined,
            }}
          />
        );
      })}

      <NodeViewContent as="div" className="db-calendar__grid__body" />
    </div>
  );
}

export const CalendarGrid = memo(CalendarGridImpl);
