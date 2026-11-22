import { memo, useMemo } from "react";
import { useCalendarViewState } from "../../context/calendar-view-context";
import { useCalendarLayout } from "../../hooks/use-calendar-layout";
import { useDatabaseContext } from "../../context/database-context";
import { CalendarGrid } from "./calendar-grid";
import { CalendarUnscheduled } from "./calendar-unscheduled";
import { unscheduledRecords } from "../../utils/manage-in-calendar";
import { CalendarNav } from "./calendar-nav";
import { CalendarWeeks } from "./calendar-weeks";
import "./database-calendar-node-view.scss";

function DatabaseCalendarNodeViewImpl() {
  const { db, source, sortedRecords } = useDatabaseContext();
  const view = db.activeView;
  // Records with no date: nowhere to put them on a month grid, so they are
  // listed beside it to be dragged onto a day (manage-in-calendar.ts).
  const unscheduled = useMemo(
    () =>
      unscheduledRecords(
        sortedRecords,
        view?.type === "calendar" ? view.datePropertyId : null,
      ),
    [sortedRecords, view],
  );
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

      <CalendarUnscheduled
        records={unscheduled}
        onOpenRecord={db.setOpenRecordId}
      />
    </div>
  );
}

export const DatabaseCalendarNodeView = memo(DatabaseCalendarNodeViewImpl);
