import { NodeViewContent } from "@tiptap/react";
import { CalendarCell } from "./calendar-cell";
import { CalendarLanes } from "./calendar-lanes";
import { memo } from "react";
import { useCalendarViewState } from "../../context/calendar-view-context";

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
            style={{
              gridColumn: column + 1,
              gridRow: row + 1,
              backgroundColor:
                column === 0 || column === 6
                  ? "var(--calendar-column-highlight)"
                  : "transparent",
            }}
          />
        );
      })}

      <NodeViewContent as="div" className="db-calendar__grid__body" />
    </div>
  );
}

export const CalendarGrid = memo(CalendarGridImpl);
