import { memo, type CSSProperties } from "react";
import { useCalendarViewState } from "../../context/calendar-view-context";

function CalendarLanesImpl() {
  const { totalCells } = useCalendarViewState();
  const rowCount = totalCells / 7;
  return (
    <>
      {Array.from({ length: 7 }).map((_, column) => {
        const style: CSSProperties = {
          gridColumn: column + 1,
          gridRow: `1 / span ${rowCount}`,
        };

        return (
          <div
            key={`lane-${column}`}
            className="db-calendar__lane"
            style={style}
            aria-hidden
          />
        );
      })}
    </>
  );
}

export const CalendarLanes = memo(CalendarLanesImpl);
