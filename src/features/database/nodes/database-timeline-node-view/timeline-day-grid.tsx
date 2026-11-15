import { memo } from "react";
import type { TimelineRange } from "../../hooks/use-timeline-layout";

function TimelineDayGridImpl({ range }: { range: TimelineRange }) {
  return (
    <div className="db-tl-day-grid" aria-hidden>
      {range.days.map((day, i) => {
        // Shaded the same way for the same reason: the part of the span
        // nobody works in. Weekends across days, nights and evenings across
        // the hours of one.
        const isWeekend =
          range.unit === "hour"
            ? day.getHours() < 8 || day.getHours() >= 18
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
