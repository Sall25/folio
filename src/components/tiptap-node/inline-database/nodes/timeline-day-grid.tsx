import { memo } from "react";
import type { TimelineRange } from "../hooks/use-timeline-layout";
import { DAY_WIDTH } from "../hooks/use-timeline-layout";

function TimelineDayGridImpl({ range }: { range: TimelineRange }) {
  return (
    <div className="db-tl-day-grid" aria-hidden>
      {range.days.map((day, i) => {
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        return (
          <div
            key={i}
            className={
              "db-tl-day-grid__col" +
              (isWeekend ? " db-tl-day-grid__col--weekend" : "")
            }
            style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
          />
        );
      })}
    </div>
  );
}

export const TimelineDayGrid = memo(TimelineDayGridImpl);
