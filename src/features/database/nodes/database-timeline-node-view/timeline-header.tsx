import { memo, useMemo } from "react";
import type { TimelineRange } from "../../hooks/use-timeline-layout";
import {
  columnParts,
  HEADER_HEIGHT,
  GROUP_ROW_HEIGHT,
  sameDay,
  sameHour,
} from "../../hooks/use-timeline-layout";

interface HighlightRange {
  left: number;
  width: number;
  tone: "hover" | "selected";
}

/** The columns worth drawing: what columnWindow worked out. */
interface Shown {
  from: number;
  to: number;
}

function TimelineHeaderImpl({
  range,
  highlights,
  shown,
}: {
  range: TimelineRange;
  highlights: HighlightRange[];
  shown: Shown;
}) {
  const cell = range.cellWidth;
  const gridWidth = range.days.length * cell;
  const hourly = range.unit === "hour";

  // In Day a column is an hour, so what is marked is the hour. Looked up
  // when the range changes rather than on every render: the range holds
  // thousands of columns and the window moves as the grid scrolls.
  const todayIdx = useMemo(() => {
    const today = new Date();
    return range.days.findIndex((d) =>
      hourly ? sameHour(d, today) : sameDay(d, today),
    );
  }, [range, hourly]);

  // Every group, with the column it starts at: a range runs over years now,
  // so the months above it are drawn from where they fall rather than laid
  // out one after another — only the ones on screen are drawn at all.
  const groups = useMemo(() => {
    const out: {
      label: string;
      days: number;
      start: number;
      year?: number;
    }[] = [];
    let at = 0;
    for (const group of range.headerGroups) {
      out.push({
        label: group.label,
        days: group.days,
        start: at,
        // Some ranges write their own year into the label, so the locale
        // places it — and its punctuation. The rest have it appended here.
        year: range.labelsCarryYear ? undefined : range.days[at]?.getFullYear(),
      });
      at += group.days;
    }
    return out;
  }, [range]);

  const inView = groups.filter(
    (g) => g.start < shown.to && g.start + g.days > shown.from,
  );
  const columns = range.days.slice(shown.from, shown.to);
  // A quarter's dates are ticks on a ruler. A year's weeks are 44px wide
  // and a number straddling two of them would belong to neither, so those
  // stay in the middle of the week they name.
  const onTick = range.timeframe === "quarter";

  return (
    <div
      className="db-tl-header"
      style={{
        width: gridWidth,
        minWidth: gridWidth,
        height: HEADER_HEIGHT + GROUP_ROW_HEIGHT,
      }}
    >
      <div
        className="db-tl-header__groups"
        style={{ height: GROUP_ROW_HEIGHT }}
      >
        {inView.map((group) => (
          <div
            key={`${group.label}-${group.start}`}
            className="db-tl-header__group"
            style={{ left: group.start * cell, width: group.days * cell }}
          >
            <span className="db-tl-header__group-label">
              {/* A year has nothing to say above its months but the year
                  itself, so the label is empty there and this must not
                  leave a space in front of it. */}
              {[group.label, group.year].filter(Boolean).join(" ")}
            </span>
          </div>
        ))}
      </div>

      <div
        className={
          "db-tl-header__days" +
          // Every unit but a plain day carries more than a number — a
          // time, a weekday, a date — so its label is wider than the
          // marker on the current column is sized for (the stylesheet).
          // A weekday is an initial and a date now — no wider than a
          // plain day's number, so it keeps the round marker.
          (range.unit === "day" || range.unit === "weekday"
            ? ""
            : " db-tl-header__days--wide")
        }
        data-unit={range.unit}
        style={{ height: HEADER_HEIGHT }}
      >
        {highlights.map((h, i) => (
          <div
            key={i}
            className={`db-tl-header__highlight db-tl-header__highlight--${h.tone}`}
            style={{ left: h.left, width: h.width }}
            aria-hidden
          />
        ))}

        {columns.map((day, i) => {
          const index = shown.from + i;
          // A month above a run of columns says it for all of them, so a
          // column that is a week need only count the day it starts on.
          // Measured off the reference: the numbers there sit on the column
          // edges, a date marking the Monday a week begins rather than
          // floating in the middle of one — which is also where the month
          // lines fall, so the two read as one ruler.
          const part = columnParts(day, range.unit, range.unit !== "week");
          return (
            <div
              key={index}
              className="db-tl-header__day"
              style={{
                left: index * cell - (onTick ? cell / 2 : 0),
                width: cell,
              }}
            >
              <span
                className={
                  "db-tl-header__day-num" +
                  (index === todayIdx ? " db-tl-header__day-num--today" : "")
                }
              >
                {part.lead && (
                  <span className="db-tl-header__day-lead">{part.lead}</span>
                )}
                {part.main}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const TimelineHeader = memo(TimelineHeaderImpl);
export type { HighlightRange, Shown };
