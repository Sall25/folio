import { useMemo } from "react";
import type {
  DatabaseProperty,
  DataSource,
  ID,
  Page,
  TimelineView,
} from "src/types";
import type { UseDatabaseReturn } from "./use-database";

export const DAY_WIDTH = 40;
/**
 * A column in the Day timeframe, which is an hour rather than a day. Wider
 * than a day column so a whole day — all 24 of them — fits on screen without
 * scrolling, and so there is room for a time under a bar's title.
 */
export const HOUR_WIDTH = 64;
/** What the Day timeframe shows: one date, an hour to a column. */
export const HOURS_IN_DAY = 24;
/** Columns in the Day timeframe: the date, and the hours either side. */
export const HOURS_SPAN = 48;
/** How many of those come before the date on show, so it sits centred. */
export const DAY_LEAD_HOURS = (HOURS_SPAN - HOURS_IN_DAY) / 2;
/**
 * A column in the Week timeframe. Still a day, but one of seven rather than
 * one of thirty, so it can carry the weekday's name and a bar can say its
 * dates inside it.
 */
export const WEEKDAY_WIDTH = 140;
/** What the Week timeframe shows: one week, Monday first. */
export const DAYS_IN_WEEK = 7;
/**
 * A column in the Quarter timeframe: a whole week. Wide enough for the date
 * of the Monday that starts it.
 */
export const WEEK_WIDTH = 100;
/** A column in the Year timeframe: a whole month, named. */
export const MONTH_WIDTH = 110;
/** A week in the Year view. Narrow: fifty-two of them have to fit, and the
 *  month above each run of them carries the context a wider one would. */
export const YEAR_WEEK_WIDTH = 44;
/** What the Year timeframe shows. */
export const MONTHS_IN_YEAR = 12;
export const ROW_HEIGHT = 34;
export const HEADER_HEIGHT = 28;
export const GROUP_ROW_HEIGHT = 28;
/** The gap under the month row (.db-tl-header__groups' margin-bottom). */
export const GROUP_ROW_GAP = 5;
/**
 * Everything above the gantt body: the month row, the gap under it, and the
 * day row. The table panel's header is pinned to this, and that is the whole
 * reason a record's row and its bar land on the same line — the panel starts
 * its rows where the gantt starts its own. Anything that measures from the
 * top of the grid uses this, not HEADER_HEIGHT + GROUP_ROW_HEIGHT, which
 * leaves the gap out.
 */
export const TOTAL_HEADER_HEIGHT =
  GROUP_ROW_HEIGHT + GROUP_ROW_GAP + HEADER_HEIGHT;
/** The table beside the grid, before anyone drags the separator: enough for
 *  the name column, so the grid gets the rest. */
export const DEFAULT_TABLE_WIDTH = 220;
/** Narrow enough to be only a name. */
export const MIN_TABLE_WIDTH = 120;
/** What the grid keeps whatever the table does: a few days of it. */
export const MIN_GRID_WIDTH = 240;

/**
 * How wide the table may be once the separator is dragged. Neither side is
 * allowed to take the other's: a table wide enough to swallow the grid turns
 * a timeline into a worse table, and a grid that squeezes the table out
 * leaves the bars with nothing to be read against.
 */
export function clampTableWidth(width: number, frameWidth: number): number {
  const most = Math.max(MIN_TABLE_WIDTH, frameWidth - MIN_GRID_WIDTH);
  return Math.round(Math.min(most, Math.max(MIN_TABLE_WIDTH, width)));
}

export type Timeframe = TimelineView["timeframe"];

/**
 * What one column stands for. A "weekday" is a day like any other — it is
 * drawn wider and named rather than numbered, because seven of them have a
 * screen to share.
 */
export type CellUnit = "day" | "hour" | "weekday" | "week" | "month";

/**
 * What a column stands for in a timeframe. The range says this too, but a
 * card knows only which view it is in — and both have to agree, or a card
 * dragged one column lands somewhere its own grid did not draw.
 */
export function unitFor(timeframe: Timeframe): CellUnit {
  if (timeframe === "day") return "hour";
  if (timeframe === "week") return "weekday";
  if (timeframe === "quarter") return "week";
  if (timeframe === "year") return "week";
  return "day";
}

/** How wide one column is, which depends on what a column is. */
export function cellWidthFor(timeframe: Timeframe): number {
  if (timeframe === "day") return HOUR_WIDTH;
  if (timeframe === "week") return WEEKDAY_WIDTH;
  if (timeframe === "quarter") return WEEK_WIDTH;
  if (timeframe === "year") return YEAR_WEEK_WIDTH;
  return DAY_WIDTH;
}

/**
 * Where the view lands when an arrow is pressed: the date one span before
 * or after the one on show.
 *
 * Measured from the date the view is anchored to, never from where its grid
 * begins. Those used to be the same thing and are not any more — a quarter's
 * grid starts on the Monday before the quarter does, which can be in the
 * quarter before it, and stepping three months from there arrives back where
 * it started. Going forward a quarter did nothing at all; going back skipped
 * one.
 *
 * Month, quarter and year land on the 1st, so a 31st cannot roll a short
 * month over into the next one.
 */
export function stepRange(
  anchor: Date,
  timeframe: Timeframe,
  dir: -1 | 1,
): Date {
  const next = new Date(anchor);
  switch (timeframe) {
    case "day":
      next.setDate(anchor.getDate() + dir);
      break;
    case "week":
      next.setDate(anchor.getDate() + dir * DAYS_IN_WEEK);
      break;
    case "quarter":
      next.setMonth(anchor.getMonth() + dir * 3, 1);
      break;
    case "year":
      next.setFullYear(anchor.getFullYear() + dir, anchor.getMonth(), 1);
      break;
    case "month":
    default:
      next.setMonth(anchor.getMonth() + dir, 1);
  }
  return next;
}

/**
 * A date moved by whole columns — what dragging a card sideways comes to.
 * A column is an hour, a day, a week or a month depending on the timeframe,
 * and the date moves by that, so a card dropped one column over is one of
 * whatever is drawn under it later.
 *
 * Through Date's own setters, so month ends and year ends carry themselves,
 * and so a month-long drag lands on the same day of the next month rather
 * than 30 days later.
 */
export function shiftDate(date: Date, unit: CellUnit, columns: number): Date {
  const next = new Date(date);
  if (columns === 0) return next;
  switch (unit) {
    case "hour":
      next.setHours(date.getHours() + columns);
      break;
    case "week":
      next.setDate(date.getDate() + columns * DAYS_IN_WEEK);
      break;
    case "month":
      next.setMonth(date.getMonth() + columns);
      break;
    case "day":
    case "weekday":
    default:
      next.setDate(date.getDate() + columns);
  }
  return next;
}

/**
 * The record a dragged row lands in front of, as reorderRecord wants it:
 * the id at the new position, or null for the end of the list.
 *
 * Moving down, the row itself is still in the list above the gap it is
 * going into, so the target is one further on — without that, a row dragged
 * down by one lands back where it started.
 */
export function dropBeforeId(
  ids: string[],
  from: number,
  to: number,
): string | null {
  const clamped = Math.max(0, Math.min(ids.length - 1, to));
  if (clamped === from) return null;
  const index = clamped > from ? clamped + 1 : clamped;
  return ids[index] ?? null;
}

/** The Monday of the week a date falls in. */
export function startOfWeek(d: Date): Date {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // getDay() counts from Sunday; a week here starts on Monday, so Sunday is
  // the last day of the week before, not the first of this one.
  const back = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - back);
  return start;
}

export interface TimelineRecord {
  id: ID;
  title: string;
  start: Date | null;
  end: Date | null;
  /**
   * The date carries no time of day — "2026-11-01" rather than an instant.
   * It means nothing in the timeframes made of days, where a column is a
   * whole day anyway, but in Day it is the difference between a record that
   * happens at midnight and one that simply happens that day.
   */
  allDay: boolean;
}

export interface TimelinePlacement {
  left: number;
  width: number;
  clippedLeft: boolean;
  clippedRight: boolean;
}

export interface TimelineRange {
  startDate: Date;
  endDate: Date;
  /**
   * One Date per column, in order: the days of the range — or, in the Day
   * timeframe, the hours of one date.
   */
  days: Date[];
  headerGroups: { label: string; days: number }[];
  /** The groups already say the year where one is wanted, so the header
   *  must not append its own. Set where the label is written by the
   *  locale, which places the year and its punctuation ("November 9,
   *  2023") better than joining two strings can. */
  labelsCarryYear?: boolean;
  /** What those Dates are. */
  unit: CellUnit;
  /** How wide one of them is drawn. */
  cellWidth: number;
}

export interface TimelineLayout {
  range: TimelineRange;
  records: TimelineRecord[];
  placement: Record<ID, TimelinePlacement>;
  startProp: DatabaseProperty | undefined;
  endProp: DatabaseProperty | undefined;
  titleProp: DatabaseProperty | undefined;
  hasEnd: boolean;
  timeframe: Timeframe;
}

export interface UseTimelineLayoutReturn {
  timelineLayout: TimelineLayout;
}

// ── Grid geometry ──────────────────────────────────────────────────────────
// One row per record, in the order the view sorts them, level with the name
// table beside it. Everything that draws in the gantt body — the bars, the
// placeholder — reads its row from here, so the two can't drift apart.

/** The top of row `index`, in pixels from the top of the gantt body. */
export function rowTop(index: number): number {
  return index * ROW_HEIGHT;
}

/** The row under a point, clamped to the rows that exist. */
export function rowAt(y: number, rowCount: number): number {
  return Math.min(rowCount - 1, Math.max(0, Math.floor(y / ROW_HEIGHT)));
}

/** The column under a point, clamped to the range on show. */
export function dayAt(
  x: number,
  dayCount: number,
  width: number = DAY_WIDTH,
): number {
  return Math.min(dayCount - 1, Math.max(0, Math.floor(x / width)));
}

// Turning a sideways scroll position into a moment in time, and back.
//
// Both read the gap between the columns rather than the unit's own length,
// because a column is an hour, a day, a week or a month, and a month is not
// a fixed number of milliseconds. Whatever the columns are, the distance
// from one to the next is what one of them is worth.
//
// They are inverses, and that is the point: a range can be rebuilt under
// the view and the view put back on the moment it was reading.

/** How long the column at `i` lasts, in ms. */
function columnSpan(range: TimelineRange, i: number): number {
  const { days } = range;
  if (days.length < 2) return 0;
  // The last column has no next one to measure against; it lasts as long
  // as the one before it.
  const a = Math.min(Math.max(i, 0), days.length - 2);
  return days[a + 1].getTime() - days[a].getTime();
}

/** The moment at a horizontal offset in the grid. */
export function timeAtOffset(range: TimelineRange, px: number): number {
  const { days, cellWidth } = range;
  if (days.length === 0 || cellWidth <= 0) return 0;
  const exact = px / cellWidth;
  const i = Math.min(Math.max(Math.floor(exact), 0), days.length - 1);
  return days[i].getTime() + (exact - i) * columnSpan(range, i);
}

/** Where a moment falls in the grid, in px. Off either end reads as a
 *  position outside it rather than clamping, so a caller can tell. */
export function offsetOfTime(range: TimelineRange, t: number): number {
  const { days, cellWidth } = range;
  if (days.length === 0 || cellWidth <= 0) return 0;
  let i = 0;
  while (i + 1 < days.length && days[i + 1].getTime() <= t) i++;
  const span = columnSpan(range, i);
  const frac = span > 0 ? (t - days[i].getTime()) / span : 0;
  return (i + frac) * cellWidth;
}

/** The box of a run of columns, given two indexes in either order. */
export function daySpan(
  a: number,
  b: number,
  width: number = DAY_WIDTH,
): { left: number; width: number; days: number } {
  const from = Math.min(a, b);
  const to = Math.max(a, b);
  return {
    left: from * width,
    width: (to - from + 1) * width,
    days: to - from + 1,
  };
}

/** Whether a record's bar already stands on this day. */
export function barCovers(
  placement: TimelinePlacement | undefined,
  dayIndex: number,
  width: number = DAY_WIDTH,
): boolean {
  if (!placement) return false;
  const x = dayIndex * width;
  return x >= placement.left && x < placement.left + placement.width;
}

/**
 * What a column is called in the header: the date, or the time with its
 * unit on it. A column of bare 1…23 in a view of a single date reads as
 * dates, which is exactly what it is not.
 */
export function columnLabel(d: Date, unit: CellUnit, withMonth = true): string {
  // The locale's own clock: "9 PM" where one is read that way, "21" where
  // it isn't. A hardcoded 24-hour label was wrong in half the world.
  if (unit === "hour") {
    return d.toLocaleTimeString(undefined, { hour: "numeric" });
  }
  if (unit === "month") {
    return d.toLocaleDateString(undefined, { month: "short" });
  }
  if (unit === "week") {
    // The Monday it starts on. A quarter is read by where in it a thing
    // falls, and a date says that better than a week number does.
    //
    // Just the day where a month sits above the column (a Year groups its
    // weeks by month): repeating it in all fifty-two says nothing, and
    // there is no room for it in any case.
    if (withMonth === false) return String(d.getDate());
    const m = d.toLocaleDateString(undefined, { month: "short" });
    return `${d.getDate()} ${m}`;
  }
  if (unit === "weekday") {
    // Seven columns have room for the name, and a week is read by its days
    // of the week more than by its dates.
    const name = d.toLocaleDateString(undefined, { weekday: "short" });
    return `${name} ${d.getDate()}`;
  }
  return String(d.getDate());
}

/** The same month: how a Year matches a date to one of its columns. */
export function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** The same week: how a Quarter matches a date to one of its columns. */
export function sameWeek(a: Date, b: Date) {
  return sameDay(startOfWeek(a), startOfWeek(b));
}

/** The same hour of the same day: how a Day timeframe matches its columns. */
export function sameHour(a: Date, b: Date) {
  return sameDay(a, b) && a.getHours() === b.getHours();
}

/**
 * A date written with no time on it — "2026-11-01" rather than an instant.
 * Only the Day timeframe cares: a record like that happens that day, not at
 * midnight, so its bar is the whole day rather than the first hour of it.
 */
export function isAllDayValue(value: unknown): boolean {
  const iso =
    typeof value === "string"
      ? value
      : typeof value === "object" &&
          value !== null &&
          "start" in value &&
          typeof (value as { start?: unknown }).start === "string"
        ? (value as { start: string }).start
        : null;
  return iso !== null && !iso.includes("T");
}

export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function parseIsoDate(iso: unknown): Date | null {
  if (typeof iso !== "string") return null;

  // A date with no time on it is a date, not an instant: "2026-11-01" is
  // the 1st wherever it is read. Date() takes that spelling as midnight
  // UTC, which is the 31st of October for every reader west of Greenwich —
  // their bars sat a day early, and in the Day timeframe a record dated
  // plainly landed on the evening before.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
    );
  }

  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function buildRange(
  year: number,
  month: number,
  day: number,
  timeframe: Timeframe,
): TimelineRange {
  // Day is the one timeframe whose columns are not days: it shows a single
  // date, an hour to a column. Everything downstream reads range.unit and
  // range.cellWidth rather than assuming a day of 40px, so the rest of the
  // grid — the header, the placeholder, a bar's geometry — is the same code.
  if (timeframe === "day") {
    // The date on show sits in the middle, with the hours either side of it
    // to scroll into: a day's work rarely stops at midnight, and a bar that
    // runs into the small hours of the next morning used to be cut off at
    // the right edge with nowhere to scroll to.
    const startDate = new Date(year, month, day, -DAY_LEAD_HOURS, 0, 0, 0);
    const hours = Array.from({ length: HOURS_SPAN }, (_, h) => {
      // setHours, not new Date(y, m, d, h): only this carries an hour past
      // midnight into the next date.
      const d = new Date(startDate);
      d.setHours(startDate.getHours() + h);
      return d;
    });
    const endDate = new Date(hours[HOURS_SPAN - 1]);
    endDate.setMinutes(59, 59, 999);

    // One group per date the span touches. The first says its year, the
    // rest don't — the locale writes it ("November 9, 2023" then
    // "November 10"), so the comma is its own and not ours to add.
    const headerGroups: { label: string; days: number }[] = [];
    for (let i = 0; i < hours.length; i++) {
      const d = hours[i];
      const prev = i > 0 ? hours[i - 1] : null;
      if (prev && sameDay(d, prev)) {
        headerGroups[headerGroups.length - 1].days += 1;
        continue;
      }
      headerGroups.push({
        label: d.toLocaleDateString(undefined, {
          day: "numeric",
          month: "long",
          // Only the first: the year is said once over the span.
          ...(headerGroups.length === 0 ? { year: "numeric" as const } : {}),
        }),
        days: 1,
      });
    }

    return {
      startDate,
      endDate,
      days: hours,
      headerGroups,
      labelsCarryYear: true,
      unit: "hour",
      cellWidth: HOUR_WIDTH,
    };
  }

  // One week, Monday to Sunday, around the date on show — the same shape as
  // Day: one span, a column per part of it. It used to be eight weeks of
  // narrow columns counted from the Sunday before the 1st, which is neither
  // a week nor a month.
  if (timeframe === "week") {
    const startDate = startOfWeek(new Date(year, month, day));
    const days = Array.from({ length: DAYS_IN_WEEK }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
    const last = days[DAYS_IN_WEEK - 1];
    const endDate = new Date(
      last.getFullYear(),
      last.getMonth(),
      last.getDate(),
      23,
      59,
      59,
      999,
    );
    const monthName = (d: Date) =>
      d.toLocaleString("default", { month: "long" });
    // The header puts the year after this, so it is left out — and the
    // month is named once unless the week runs across two of them.
    const label =
      startDate.getMonth() === last.getMonth()
        ? `${startDate.getDate()} – ${last.getDate()} ${monthName(last)}`
        : `${startDate.getDate()} ${monthName(startDate)} – ` +
          `${last.getDate()} ${monthName(last)}`;

    return {
      startDate,
      endDate,
      days,
      headerGroups: [{ label, days: DAYS_IN_WEEK }],
      unit: "weekday",
      cellWidth: WEEKDAY_WIDTH,
    };
  }

  // A quarter, a week to a column: the weeks that cover it, from the Monday
  // on or before the 1st to the one that holds the last day. Ninety columns
  // of days was four screens of scrolling to read three months.
  if (timeframe === "quarter") {
    const q = Math.floor(month / 3);
    const first = new Date(year, q * 3, 1);
    const lastDay = new Date(year, q * 3 + 3, 0);
    const startDate = startOfWeek(first);
    const lastWeek = startOfWeek(lastDay);
    const days: Date[] = [];
    const cursor = new Date(startDate);
    while (cursor <= lastWeek) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
    // The range runs to the end of the last week on show, not the last day
    // of the quarter: the column is the week, so a record in the days after
    // the quarter's end still belongs to the column that is drawn for it.
    const endDate = new Date(lastWeek);
    endDate.setDate(lastWeek.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    const monthName = (d: Date) =>
      d.toLocaleString("default", { month: "long" });
    return {
      startDate,
      endDate,
      days,
      // No year: the header adds it.
      headerGroups: [
        {
          label: `${monthName(first)} – ${monthName(lastDay)}`,
          days: days.length,
        },
      ],
      unit: "week",
      cellWidth: WEEK_WIDTH,
    };
  }

  // A year, a month to a column. Three hundred and sixty-five day-columns
  // came to 14,600px, which is not a year anyone could read.
  if (timeframe === "year") {
    /** The Thursday of a week beginning on `d`: the day that settles which
     *  month and which year the week belongs to, as a week is never split
     *  between two of either. */
    const midweek = (d: Date) => {
      const t = new Date(d);
      t.setDate(d.getDate() + 3);
      return t;
    };

    // Weeks, not months. Twelve month-wide columns could say which month a
    // thing fell in and nothing more: a bar of a few days had no width to
    // speak of and every short record in a month stacked on its 1st.
    // The year owns the weeks whose midweek falls in it, which is how a
    // week that straddles new year is settled — by where most of it lies.
    // Taken by their Mondays instead, a year both opened under the last
    // month of the year before and closed under a second "January".
    const cursor = startOfWeek(new Date(year, 0, 4));
    const days: Date[] = [];
    while (midweek(cursor).getFullYear() === year) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
    const startDate = days[0];
    const lastWeek = days[days.length - 1];
    // To the end of the last week drawn, not the year's last day: the
    // column is the week, so a record in the days after new year still
    // belongs to the column drawn for it.
    const endDate = new Date(lastWeek);
    endDate.setDate(lastWeek.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    // A group per month, by the month holding each week's midweek — the
    // month most of the week falls in. The first group says the year,
    // written by the locale with its own punctuation.
    const headerGroups: { label: string; days: number }[] = [];
    days.map(midweek).forEach((d, i, mid) => {
      const prev = i > 0 ? mid[i - 1] : null;
      if (prev && sameMonth(d, prev)) {
        headerGroups[headerGroups.length - 1].days += 1;
        return;
      }
      headerGroups.push({
        label: d.toLocaleDateString(undefined, {
          month: "long",
          ...(headerGroups.length === 0 ? { year: "numeric" as const } : {}),
        }),
        days: 1,
      });
    });

    return {
      startDate,
      endDate,
      days,
      headerGroups,
      labelsCarryYear: true,
      unit: "week",
      cellWidth: YEAR_WEEK_WIDTH,
    };
  }

  // A month, a day to a column — the one span still read that way, and the
  // only timeframe left here now that each of the others builds its own.
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  const days: Date[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const headerGroups = [
    {
      // No year here: the header adds it after the label, and asking for it
      // twice is what made every month read "Novembre 2026 2026".
      label: startDate.toLocaleString("default", { month: "long" }),
      days: days.length,
    },
  ];

  return {
    startDate,
    endDate,
    days,
    headerGroups,
    unit: "day",
    cellWidth: DAY_WIDTH,
  };
}

/**
 * Where a record's bar sits in the range on show, or null if it falls
 * outside it. Exported for its own tests: it is the one piece of arithmetic
 * that has to agree with what a column means.
 */
export function getGeo(
  rec: TimelineRecord,
  range: TimelineRange,
  hasEnd: boolean,
): {
  left: number;
  width: number;
  clippedLeft: boolean;
  clippedRight: boolean;
} | null {
  if (!rec.start) return null;
  const effEnd = hasEnd ? (rec.end ?? rec.start) : rec.start;
  if (effEnd < range.startDate || rec.start > range.endDate) return null;

  const w = range.cellWidth;

  // A date with no time on it happens that day, not at midnight, so in the
  // Day timeframe it is the whole day rather than its first hour.
  if (range.unit === "hour" && rec.allDay) {
    // Its own dates, not the whole span: Day shows the hours either side of
    // the date on show, and a record dated plainly belongs to its day, not
    // to everything on screen.
    const si = range.days.findIndex((d) => sameDay(d, rec.start!));
    // Backwards: the LAST column of the end date, not the first, or a day
    // comes out one hour wide.
    let ei = -1;
    for (let i = range.days.length - 1; i >= 0; i--) {
      if (sameDay(range.days[i], effEnd)) {
        ei = i;
        break;
      }
    }
    const from = si < 0 ? 0 : si;
    const to = ei < 0 ? range.days.length - 1 : ei;
    // Clipped by the day's own bounds: a date whose midnight falls before
    // the span still shows, cut off, and the span starts mid-afternoon.
    const dayStart = new Date(rec.start);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(effEnd);
    dayEnd.setHours(23, 59, 59, 999);
    return {
      left: from * w,
      width: Math.max(w, (to - from + 1) * w),
      clippedLeft: dayStart < range.startDate,
      clippedRight: dayEnd > range.endDate,
    };
  }

  const cl = rec.start < range.startDate;
  const cr = effEnd > range.endDate;
  const s = cl ? range.startDate : rec.start;
  const e = cr ? range.endDate : effEnd;

  const inCell =
    range.unit === "hour"
      ? sameHour
      : range.unit === "week"
        ? sameWeek
        : range.unit === "month"
          ? sameMonth
          : sameDay;
  const si = range.days.findIndex((d) => inCell(d, s));
  const ei = range.days.findIndex((d) => inCell(d, e));

  const left = (si < 0 ? 0 : si) * w;
  const width = Math.max(
    w,
    ((ei < 0 ? range.days.length - 1 : ei) - (si < 0 ? 0 : si) + 1) * w,
  );

  return { left, width, clippedLeft: cl, clippedRight: cr };
}

// The overlap-packing pass that used to live here is gone. It put two
// records on one line when their dates didn't meet, which made the grid
// disagree with the table beside it — and that table is how the grid is
// read. One record, one row, in the view's order: rowTop(index).

export function parseDateValue(value: unknown): {
  start: Date | null;
  end: Date | null;
} {
  if (typeof value === "string") {
    const date = parseIsoDate(value);

    return {
      start: date,
      end: date,
    };
  }

  if (typeof value === "object" && value !== null && "start" in value) {
    const start =
      typeof value.start === "string" ? parseIsoDate(value.start) : null;

    const end =
      "end" in value && typeof value.end === "string"
        ? parseIsoDate(value.end)
        : start;

    return {
      start,
      end,
    };
  }

  return {
    start: null,
    end: null,
  };
}

export function useTimelineLayout(
  sortedRecords: Page[],
  source: DataSource | null,
  db: UseDatabaseReturn,
  year: number,
  month: number,
  day: number,
): UseTimelineLayoutReturn {
  const activeView = db.activeView as TimelineView | undefined;
  const timeframe: Timeframe = activeView?.timeframe ?? "month";

  const startProp = source?.properties.find(
    (p) => p.id === activeView?.startDatePropertyId,
  );
  const endProp = source?.properties.find(
    (p) => p.id === activeView?.endDatePropertyId,
  );
  const titleProp = source?.properties.find((p) => p.config.type === "title");
  const hasEnd = !!endProp;

  const timelineLayout = useMemo<TimelineLayout>(() => {
    const range = buildRange(year, month, day, timeframe);

    const records: TimelineRecord[] = sortedRecords.map((r) => {
      const raw = startProp ? r.values?.[startProp.id] : null;
      const dateValue = parseDateValue(raw);

      return {
        id: r.id,
        title:
          (titleProp && (r.values?.[titleProp.id] as string)) || "Untitled",
        start: dateValue.start,
        end: dateValue.end,
        allDay: isAllDayValue(raw),
      };
    });

    const placement: Record<ID, TimelinePlacement> = {};
    records.forEach((rec) => {
      const geo = getGeo(rec, range, rec.end != null);
      if (geo) placement[rec.id] = geo;
    });

    return {
      range,
      records,
      placement,
      startProp,
      endProp,
      titleProp,
      hasEnd,
      timeframe,
    };
  }, [
    sortedRecords,
    year,
    month,
    day,
    timeframe,
    startProp,
    endProp,
    titleProp,
    hasEnd,
  ]);

  return { timelineLayout };
}
