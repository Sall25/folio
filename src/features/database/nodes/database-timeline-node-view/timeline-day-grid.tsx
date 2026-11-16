import { memo } from "react";
import type { TimelineRange } from "../../hooks/use-timeline-layout";

function TimelineDayGridImpl({ range }: { range: TimelineRange }) {
  return (
    <div className="db-tl-day-grid" aria-hidden>
      {range.days.map((day, i) => {
        // Shaded the same way for the same reason: so the eye can find
        // where it is without reading the ruler. Weekends across days,
        // and — where a column is a whole week and no weekend is left to
        // mark — alternating months, which is where a quarter's own
        // divisions fall, or alternating quarters across a year of months.
        //
        // Not the hours of a day. Shading the evening and the night put
        // most of Day under grey, which marks nothing: the hours are
        // already told apart by their own lines and by the ruler, and
        // what a working day is differs by the person reading it.
        const isWeekend =
          range.unit === "hour"
            ? false
            : range.unit === "week"
              ? day.getMonth() % 2 === 1
              : range.unit === "month"
                ? Math.floor(day.getMonth() / 3) % 2 === 1
                : day.getDay() === 0 || day.getDay() === 6;
        // Midnight, where the date on the ruler above changes. Only in
        // Day: elsewhere a column is a whole day or more and every edge
        // is already one.
        const isDayStart = range.unit === "hour" && day.getHours() === 0;
        return (
          <div
            key={i}
            className={
              "db-tl-day-grid__col" +
              (isWeekend ? " db-tl-day-grid__col--weekend" : "") +
              (isDayStart ? " db-tl-day-grid__col--day-start" : "")
            }
            style={{ left: i * range.cellWidth, width: range.cellWidth }}
          />
        );
      })}
    </div>
  );
}

export const TimelineDayGrid = memo(TimelineDayGridImpl);
