import { memo } from "react";
import { useCalendarViewState } from "../../context/calendar-view-context";
import { useCalendarLayout } from "../../hooks/use-calendar-layout";
import { useDatabaseContext } from "../../context/database-context";
import { CalendarGrid } from "./calendar-grid";
import { CalendarNav } from "./calendar-nav";
import { CalendarWeeks } from "./calendar-weeks";
import "./database-calendar-node-view.scss";

function DatabaseCalendarNodeViewImpl() {
  const { db, source, sortedRecords } = useDatabaseContext();
  const { year, month } = useCalendarViewState();
  const { calendarLayout } = useCalendarLayout(
    sortedRecords,
    source,
    db,
    year,
    month,
  );

  const { weekHeights } = calendarLayout;

  return (
    <div
      className="db-calendar"
      data-type="database-calendar"
      style={{
        gridTemplateRows: weekHeights.map((height) => `${height}px`).join(" "),
      }}
    >
      <CalendarNav />

      <CalendarWeeks />

      <CalendarGrid weekHeights={weekHeights} />
    </div>
  );
}

export const DatabaseCalendarNodeView = memo(DatabaseCalendarNodeViewImpl);
