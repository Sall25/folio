import { memo, useMemo } from "react";
import type { TimelineRange } from "../../hooks/use-timeline-layout";
import {
  columnParts,
  HEADER_HEIGHT,
  GROUP_ROW_HEIGHT,
  offsetOfTime,
  todayOffset,
  tickUnder,
} from "../../hooks/use-timeline-layout";
import { useTranslation } from "react-i18next";

/** How wide today's marker is, as the stylesheet draws it: the room a date
 *  printed under it would need to give up. */
const TODAY_MARKER_WIDTH = 22;

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
  pinned,
}: {
  range: TimelineRange;
  highlights: HighlightRange[];
  shown: Shown;
  /** The heading stuck at the left edge — the lead, and the only one that
   *  says the year. */
  pinned: number;
}) {
  const cell = range.cellWidth;
  const gridWidth = range.days.length * cell;
  const { i18n } = useTranslation();

  // Today, twice over: the column it falls in, and where in the grid it
  // actually is.
  //
  // In Day, Week and Month a column is today, so the marker is that
  // column's own number, with the line running down from under it. In a
  // quarter or a year a column is a WEEK and its number is the Monday it
  // starts on — Monday the 16th for a Sunday the 22nd, a marker six days
  // from the line it belongs to, reading the wrong date. There the marker
  // is drawn on the line instead, as today's own date.
  //
  // Looked up when the range changes rather than on every render: the range
  // holds thousands of columns and the window moves as it scrolls.
  const weekly = range.unit === "week";
  const today = useMemo(() => {
    const at = todayOffset(range, new Date().getTime());
    if (at === null) return null;
    return {
      at,
      column: Math.floor(offsetOfTime(range, new Date().getTime()) / cell),
      // Its date, written the way a day column writes one.
      label: columnParts(new Date(), "day", false, i18n.resolvedLanguage).main,
    };
  }, [range, cell, i18n.resolvedLanguage]);
  const todayIdx = weekly ? -1 : (today?.column ?? -1);

  // The week number the marker stands on top of, if any. A week's date is
  // written over the tick it begins on, and today can fall within a few
  // pixels of the next one — "22" printed over "23". The marker wins; the
  // date it covers is left out.
  const coveredTick =
    weekly && today ? tickUnder(today.at, cell, TODAY_MARKER_WIDTH) : -1;

  // Every group, with the column it starts at: a range runs over years now,
  // so the months above it are drawn from where they fall rather than laid
  // out one after another — only the ones on screen are drawn at all.
  const groups = useMemo(() => {
    const out: {
      label: string;
      full: string;
      days: number;
      start: number;
      index: number;
      year?: number;
    }[] = [];
    let at = 0;
    for (const group of range.headerGroups) {
      out.push({
        label: group.label,
        full: group.full,
        days: group.days,
        start: at,
        index: out.length,
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
        {inView.map((group) => {
          // Only the lead says which year all this is. The ones after it
          // run on from it, and a year over each would be the same four
          // digits a dozen times across one of them.
          const lead = group.index === pinned;
          return (
            <div
              key={`${group.label}-${group.start}`}
              className="db-tl-header__group"
              style={{ left: group.start * cell, width: group.days * cell }}
            >
              <span className="db-tl-header__group-label">
                {/* A year has nothing to say above its months but the year
                    itself, so the label is empty there and this must not
                    leave a space in front of it. */}
                {[
                  lead ? group.full : group.label,
                  lead ? group.year : undefined,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </span>
            </div>
          );
        })}
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

        {/* A quarter and a year mark today on the line, not on the week
            it falls in — the column's own number is that week's Monday. */}
        {weekly && today && (
          <div
            className="db-tl-header__day"
            style={{ left: today.at - cell / 2, width: cell }}
          >
            <span className="db-tl-header__day-num db-tl-header__day-num--today">
              {today.label}
            </span>
          </div>
        )}

        {columns.map((day, i) => {
          const index = shown.from + i;
          // A month above a run of columns says it for all of them, so a
          // column that is a week need only count the day it starts on.
          // Measured off the reference: the numbers there sit on the column
          // edges, a date marking the Monday a week begins rather than
          // floating in the middle of one — which is also where the month
          // lines fall, so the two read as one ruler.
          const part = columnParts(
            day,
            range.unit,
            range.unit !== "week",
            i18n.resolvedLanguage,
          );
          return (
            <div
              key={index}
              className="db-tl-header__day"
              style={{
                left: index * cell - (onTick ? cell / 2 : 0),
                width: cell,
              }}
            >
              {index !== coveredTick && (
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const TimelineHeader = memo(TimelineHeaderImpl);
export type { HighlightRange, Shown };
