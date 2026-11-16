import { memo, useMemo } from "react";
import {
  offsetOfTime,
  type TimelineRange,
} from "../../hooks/use-timeline-layout";

/**
 * Where the ruler above changes what it is naming — midnight in a Day,
 * the first of the month in a Year — as a position, not as a column.
 *
 * A month does not begin where a week does. August 2024 opens on the
 * Thursday of the week of the 29th of July, three sevenths of the way
 * into that column, and the line belongs there: drawn at the column's
 * edge instead, every month reads as a whole number of weeks long and
 * none of them starts on the day it actually starts on.
 */
function dividersFor(range: TimelineRange): number[] {
  const out: number[] = [];
  let at = 0;
  range.headerGroups.forEach((group, gi) => {
    const start = at;
    at += group.days;
    // The grid's own left edge is not a division.
    if (gi === 0) return;
    const col = range.days[start];
    if (!col) return;

    let boundary = col;
    if (range.unit === "week") {
      // The month this run of weeks is headed by is the one holding their
      // midweek — the same rule buildRange groups them with — and the
      // division is that month's first day.
      const mid = new Date(col);
      mid.setDate(col.getDate() + 3);
      boundary = new Date(mid.getFullYear(), mid.getMonth(), 1);
    }
    out.push(offsetOfTime(range, boundary.getTime()));
  });
  return out;
}

function TimelineDayGridImpl({ range }: { range: TimelineRange }) {
  const dividers = useMemo(() => dividersFor(range), [range]);

  // Where the header divides the months itself, the divisions are drawn
  // rather than shaded, and the shading below would only fight the lines.
  const grouped = range.headerGroups.length > 1;

  // A Year: fifty-two week columns under month headings. The months are
  // the structure there, and a line on every week buries them — so the
  // columns are left unruled and the weeks are read off the ruler. A
  // quarter's fourteen are few enough to rule, and an hour column is a
  // division worth drawing in its own right.
  const monthsOnly = range.unit === "week" && grouped;

  return (
    <div
      className={"db-tl-day-grid" + (monthsOnly ? " db-tl-day-grid--bare" : "")}
      aria-hidden
    >
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
              ? !grouped && day.getMonth() % 2 === 1
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

      {dividers.map((left, i) => (
        <div
          key={`d${i}`}
          className="db-tl-day-grid__divide"
          style={{ left }}
        />
      ))}
    </div>
  );
}

export const TimelineDayGrid = memo(TimelineDayGridImpl);
