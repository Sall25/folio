import { memo } from "react";
import type { TimelineRange } from "../../hooks/use-timeline-layout";
import {
  DAY_WIDTH,
  HEADER_HEIGHT,
  GROUP_ROW_HEIGHT,
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
  const gridWidth = range.days.length * DAY_WIDTH;

  const today = new Date();
  const todayIdx = range.days.findIndex(
    (d) =>
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate(),
  );

  let dayCursor = 0;
  const groupsWithYear = range.headerGroups.map((group) => {
    const groupStart = range.days[dayCursor];
    // eslint-disable-next-line react-hooks/immutability
    dayCursor += group.days;
    return { ...group, year: groupStart?.getFullYear() };
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
            style={{ width: group.days * DAY_WIDTH }}
          >
            <span className="db-tl-header__group-label">
              {group.label}
              {group.year != null ? ` ${group.year}` : ""}
            </span>
          </div>
        ))}
      </div>

      <div className="db-tl-header__days" style={{ height: HEADER_HEIGHT }}>
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
            style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
          >
            <span
              className={
                "db-tl-header__day-num" +
                (i === todayIdx ? " db-tl-header__day-num--today" : "")
              }
            >
              {day.getDate()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const TimelineHeader = memo(TimelineHeaderImpl);
export type { HighlightRange };
