import { memo } from "react";
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

function TimelineHeaderImpl({
  range,
  highlights,
}: {
  range: TimelineRange;
  highlights: HighlightRange[];
}) {
  const cell = range.cellWidth;
  const gridWidth = range.days.length * cell;
  const hourly = range.unit === "hour";

  const today = new Date();
  // In Day every column is the same date, so what is marked is the hour.
  const todayIdx = range.days.findIndex((d) =>
    hourly ? sameHour(d, today) : sameDay(d, today),
  );

  let dayCursor = 0;
  const groupsWithYear = range.headerGroups.map((group) => {
    const groupStart = range.days[dayCursor];
    // eslint-disable-next-line react-hooks/immutability
    dayCursor += group.days;
    // Some ranges write their own year into the label, so the locale
    // places it — and its punctuation. The rest have it appended here.
    return {
      ...group,
      year: range.labelsCarryYear ? undefined : groupStart?.getFullYear(),
    };
  });

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
        {groupsWithYear.map((group, i) => (
          <div
            key={`${group.label}-${i}`}
            className="db-tl-header__group"
            style={{ width: group.days * cell }}
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

        {range.days.map((day, i) => (
          <div
            key={i}
            className="db-tl-header__day"
            style={{ left: i * cell, width: cell }}
          >
            <span
              className={
                "db-tl-header__day-num" +
                (i === todayIdx ? " db-tl-header__day-num--today" : "")
              }
            >
              {/* A month above a run of columns says it for all of
                  them, so the column itself need only count its day —
                  a Year's fifty-two weeks, where there is no room for it
                  twice over in any case. A quarter's weeks are wide
                  enough to carry their own month and few enough to want
                  it. */}
              {(() => {
                const part = columnParts(
                  day,
                  range.unit,
                  range.timeframe !== "year",
                );
                return (
                  <>
                    {part.lead && (
                      <span className="db-tl-header__day-lead">
                        {part.lead}
                      </span>
                    )}
                    {part.main}
                  </>
                );
              })()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const TimelineHeader = memo(TimelineHeaderImpl);
export type { HighlightRange };
