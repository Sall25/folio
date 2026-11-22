import { memo, useMemo, useState } from "react";
import { useCalendarViewState } from "../../context/calendar-view-context";
import { useCalendarLayout } from "../../hooks/use-calendar-layout";
import { useDatabaseContext } from "../../context/database-context";
import { useOpenRecord } from "../../hooks/use-open-record";
import { CalendarGrid } from "./calendar-grid";
import { CalendarUnscheduled } from "./calendar-unscheduled";
import { unscheduledRecords } from "../../utils/manage-in-calendar";
import { CalendarNav } from "./calendar-nav";
import { CalendarWeeks } from "./calendar-weeks";
import { ViewStage } from "../../components/view-stage";
import "./database-calendar-node-view.scss";

function DatabaseCalendarNodeViewImpl() {
  const { db, source, sortedRecords } = useDatabaseContext();
  const view = db.activeView;
  // The view's own way of opening a record (Peek, Center, Full), which is
  // what every other surface here uses.
  const openRecord = useOpenRecord(view);
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

  // A month in a page's column gives each day a few lines; opened over the
  // page it gives them the screen (view-stage.tsx).
  const [staged, setStaged] = useState(false);

  return (
    <ViewStage
      open={staged}
      onClose={() => setStaged(false)}
      label={view?.name ?? "Calendar"}
    >
      <div
        className="db-calendar"
        data-type="database-calendar"
        data-staged={staged || undefined}
        style={{
          gridTemplateRows: weekHeights
            .map((height) => `${height}px`)
            .join(" "),
        }}
      >
        <CalendarNav onOpenStage={staged ? undefined : () => setStaged(true)} />

        <CalendarWeeks />

        <CalendarGrid weekHeights={weekHeights} />

        <CalendarUnscheduled records={unscheduled} onOpenRecord={openRecord} />
      </div>
    </ViewStage>
  );
}

export const DatabaseCalendarNodeView = memo(DatabaseCalendarNodeViewImpl);
