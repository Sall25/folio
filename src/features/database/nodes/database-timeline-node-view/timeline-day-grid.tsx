import { memo } from "react";
import type { TimelineRange } from "../../hooks/use-timeline-layout";

function TimelineDayGridImpl({ range }: { range: TimelineRange }) {
  return (
    <div className="db-tl-day-grid" aria-hidden>
      {range.days.map((day, i) => {
        // Shaded the same way for the same reason: so the eye can find
        // where it is without reading the ruler. Weekends across days,
        // nights and evenings across the hours of one, and — where a
        // column is a whole week and no weekend is left to mark —
        // alternating months, which is where a quarter's own divisions
        // fall — or alternating quarters across a year of months.
        const isWeekend =
          range.unit === "hour"
            ? day.getHours() < 8 || day.getHours() >= 18
            : range.unit === "week"
              ? day.getMonth() % 2 === 1
              : range.unit === "month"
                ? Math.floor(day.getMonth() / 3) % 2 === 1
                : day.getDay() === 0 || day.getDay() === 6;
        return (
          <div
            key={i}
            className={
              "db-tl-day-grid__col" +
              (isWeekend ? " db-tl-day-grid__col--weekend" : "")
            }
            style={{ left: i * range.cellWidth, width: range.cellWidth }}
          />
        );
      })}
    </div>
  );
}

export const TimelineDayGrid = memo(TimelineDayGridImpl);
