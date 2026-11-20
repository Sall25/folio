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
export const WEEKDAY_WIDTH = 225;
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
      // An hour of elapsed time, not the same minute of another wall-clock
      // hour. Where the clocks go forward, 02:00 does not exist: asking for
      // it lands on 03:00, and so does asking for 03:00 — which drew one
      // column twice and left an hour out of the grid. A day of columns
      // never met this; a year of them meets it twice.
      next.setTime(date.getTime() + columns * 3_600_000);
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
  /** Which timeframe built it. The unit does not say: a quarter and a year
   *  are both weeks, drawn differently, and the grid and the header each
   *  have to tell them apart. */
  timeframe: Timeframe;
  /**
   * The column where the page the view is anchored to begins — the month,
   * the week, the date that was asked for. The columns before it are the
   * context a scroll runs back into, and the ones after its page the
   * context it runs on into. 0 where there is none.
   */
  anchorIndex: number;
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
    // The letter and the date: a week is read by its days of the week as
    // much as by its dates, and at this width the initial is enough to
    // tell them apart — the column under it is a whole day wide.
    const name = d.toLocaleDateString(undefined, { weekday: "narrow" });
    return `${name} ${d.getDate()}`;
  }
  return String(d.getDate());
}

/**
 * A column's label in two parts, where it has two: a quieter lead and the
 * part that carries it. A weekday's initial sits beside its date and is
 * not the thing being read — the date is — so the header can set it back
 * without either of them being a separate label to keep in step.
 */
export function columnParts(
  d: Date,
  unit: CellUnit,
  withMonth = true,
): { lead?: string; main: string } {
  if (unit === "weekday") {
    return {
      lead: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      main: String(d.getDate()),
    };
  }
  return { main: columnLabel(d, unit, withMonth) };
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

/**
 * How many pages of context a range carries on either side of the page the
 * view is anchored to.
 *
 * This is the whole of how a timeline scrolls past the range on show, and
 * the numbers are the point of it. The scroller's content is what a person
 * can scroll across, so what these say is: there is no end to arrive at.
 * A year of hours, ten years of days, a century of weeks — nothing a wheel
 * or a thumb does in a sitting reaches the edge of that, so nothing ever
 * has to be grown, stepped or put back, and no scroll position is ever
 * written while a gesture is under way. That was every snap there has been
 * here: a range that ran out, and something trying to hide it.
 *
 * Only what is on screen is drawn (columnWindow), so the cost of a range
 * this wide is the Dates in it and not the columns — a few thousand of
 * them, built once when the view moves rather than as anyone scrolls.
 */
export function padFor(timeframe: Timeframe): number {
  switch (timeframe) {
    case "day":
      return 180; // 48 hours to a page: about a year of them
    case "week":
      return 260; // ten years
    case "quarter":
      return 200; // a century
    case "year":
      return 60; // a hundred and twenty years
    case "month":
    default:
      return 120; // twenty years
  }
}

/** How many columns are drawn at a time, rounded to this so that the set
 *  changes every so often rather than every frame. */
export const WINDOW_BLOCK = 64;

/**
 * Which columns are worth drawing: the ones on screen, and a block either
 * side so that scrolling has somewhere to go before the next set is worked
 * out. Rounded outwards to whole blocks, so a scroll of a few pixels asks
 * for the same window as the last one and the header and the grid are left
 * alone.
 *
 * A range is thousands of columns wide now, and a column is a div in the
 * header and another in the grid. Drawn in full that is tens of thousands
 * of them for a view that shows thirty.
 */
export function columnWindow(
  range: TimelineRange,
  scrollLeft: number,
  viewportWidth: number,
): { from: number; to: number } {
  const count = range.days.length;
  const cell = range.cellWidth;
  if (count === 0 || cell <= 0) return { from: 0, to: 0 };
  // Before the viewport has been measured, enough to fill a wide screen:
  // nothing is worse than a grid that draws nothing on its first paint.
  const width = viewportWidth > 0 ? viewportWidth : 2000;
  const first = Math.floor(scrollLeft / cell);
  const last = Math.ceil((scrollLeft + width) / cell);
  const block = WINDOW_BLOCK;
  return {
    from: Math.max(0, Math.floor(first / block) * block - block),
    to: Math.min(count, Math.ceil(last / block) * block + block),
  };
}

/** The month a column belongs to — for a week, the month holding its
 *  midweek, as a week is never split between two of them. */
function groupDate(d: Date, unit: CellUnit): Date {
  if (unit !== "week") return d;
  const mid = new Date(d);
  mid.setDate(d.getDate() + 3);
  return mid;
}

/**
 * What stands above the columns: a date per date in Day, a year per year
 * where a column is itself a month, a month per month everywhere else.
 *
 * The year is written in at the first group and wherever the year changes.
 * A range carrying pages of context around its own crosses years, which is
 * why this is one rule rather than one per timeframe — and why the locale
 * writes it ("9 November 2026", "novembre 2026"), placing the year and its
 * punctuation where that language puts them. The header must not then
 * append its own: labelsCarryYear.
 */
export function headerGroupsFor(
  days: Date[],
  unit: CellUnit,
): { label: string; days: number }[] {
  const scale = unit === "hour" ? "date" : unit === "month" ? "year" : "month";
  const out: { label: string; days: number }[] = [];
  let prev: Date | null = null;
  for (const col of days) {
    const d = groupDate(col, unit);
    const same =
      prev !== null &&
      (scale === "date"
        ? sameDay(d, prev)
        : scale === "year"
          ? d.getFullYear() === prev.getFullYear()
          : sameMonth(d, prev));
    if (same) {
      out[out.length - 1].days += 1;
      continue;
    }
    const turnsYear = prev === null || d.getFullYear() !== prev.getFullYear();
    out.push({
      label: d.toLocaleDateString(
        undefined,
        scale === "year"
          ? { year: "numeric" }
          : {
              ...(scale === "date"
                ? { day: "numeric", month: "long" }
                : { month: "long" }),
              ...(turnsYear ? { year: "numeric" as const } : {}),
            },
      ),
      days: 1,
    });
    prev = d;
  }
  return out;
}

/** The last instant a column stands for: what a range's endDate is, taken
 *  from the last of them. */
function endOfColumn(d: Date, unit: CellUnit): Date {
  const end = new Date(d);
  switch (unit) {
    case "hour":
      end.setMinutes(59, 59, 999);
      break;
    case "week":
      end.setDate(d.getDate() + DAYS_IN_WEEK - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "month":
      end.setMonth(d.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      end.setHours(23, 59, 59, 999);
  }
  return end;
}

/** A page with more pages of its own columns either side of it, by the
 *  column's own unit — hours before an hour, weeks before a week — so the
 *  context is made of the same thing the page is. */
function padPage(page: TimelineRange, pad: number): TimelineRange {
  const { unit } = page;
  const last = page.days[page.days.length - 1];
  const before: Date[] = [];
  for (let i = page.days.length * pad; i >= 1; i--)
    before.push(shiftDate(page.days[0], unit, -i));
  const after: Date[] = [];
  for (let i = 1; i <= page.days.length * pad; i++)
    after.push(shiftDate(last, unit, i));

  const days = [...before, ...page.days, ...after];
  return {
    ...page,
    days,
    startDate: days[0],
    endDate: endOfColumn(days[days.length - 1], unit),
    headerGroups: headerGroupsFor(days, unit),
    labelsCarryYear: true,
    anchorIndex: before.length,
  };
}

/**
 * The columns a timeline draws: the page asked for, and `pad` pages of
 * context either side of it (padFor says how many, and why).
 *
 * pad 0 is the page alone, which is what the arrows and every test that
 * only cares about one span ask for.
 */
export function buildRange(
  year: number,
  month: number,
  day: number,
  timeframe: Timeframe,
  pad = 0,
): TimelineRange {
  const page = buildPage(year, month, day, timeframe);
  return pad > 0 ? padPage(page, pad) : page;
}

function buildPage(
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
    // An hour of elapsed time per column (shiftDate says why it is not the
    // wall clock), which carries past midnight into the next date of its
    // own accord.
    const hours = Array.from(
      { length: HOURS_SPAN },
      (_, h) => new Date(startDate.getTime() + h * 3_600_000),
    );
    const endDate = new Date(hours[HOURS_SPAN - 1]);
    endDate.setMinutes(59, 59, 999);

    return {
      startDate,
      endDate,
      days: hours,
      // One group per date the span touches, named by the locale.
      headerGroups: headerGroupsFor(hours, "hour"),
      labelsCarryYear: true,
      unit: "hour",
      cellWidth: HOUR_WIDTH,
      timeframe,
      anchorIndex: 0,
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
    return {
      startDate,
      endDate,
      days,
      // A group per month, as a Day and a Year have: one heading for a week
      // inside a month, two where it runs across the turn of one. The dates
      // themselves are under every column already, so the heading names the
      // month rather than repeating the span.
      headerGroups: headerGroupsFor(days, "weekday"),
      labelsCarryYear: true,
      unit: "weekday",
      cellWidth: WEEKDAY_WIDTH,
      timeframe,
      anchorIndex: 0,
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
      timeframe,
      anchorIndex: 0,
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

    return {
      startDate,
      endDate,
      days,
      // A group per month, by the month holding each week's midweek — the
      // month most of the week falls in (headerGroupsFor, groupDate).
      headerGroups: headerGroupsFor(days, "week"),
      labelsCarryYear: true,
      unit: "week",
      cellWidth: YEAR_WEEK_WIDTH,
      timeframe,
      anchorIndex: 0,
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
    timeframe,
    anchorIndex: 0,
  };
}

/**
 * The column holding a moment: the last one that starts at or before it.
 *
 * A search, not a scan. A range is thousands of columns wide and this runs
 * twice for every record every time one of them changes — and the columns
 * are in order, which is all a search needs. Out of range either way it
 * gives the nearest end, which is what the callers want: they have already
 * clipped to the range's own bounds.
 */
function columnOf(range: TimelineRange, t: number): number {
  const { days } = range;
  let lo = 0;
  let hi = days.length - 1;
  let out = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (days[mid].getTime() <= t) {
      out = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return out;
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
    //
    // Clipped by the day's own bounds too: a date whose midnight falls
    // before the span still shows, cut off, and the span starts mid-
    // afternoon.
    const dayStart = new Date(rec.start);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(effEnd);
    dayEnd.setHours(23, 59, 59, 999);
    // Midnight's own column, and the one holding the last moment of the end
    // date — the LAST of that date's hours, not the first, or a day comes
    // out one hour wide.
    const from = columnOf(range, dayStart.getTime());
    const to = columnOf(range, dayEnd.getTime());
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

  // The columns those two moments fall in. Whatever a column is — an hour,
  // a day, a week — the one holding a moment is the last one that started
  // before it, so this needs no rule per unit.
  const si = columnOf(range, s.getTime());
  const ei = columnOf(range, e.getTime());

  const left = si * w;
  const width = Math.max(w, (ei - si + 1) * w);

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
    // With its context either side: the scroller is handed several pages of
    // columns, so a sideways scroll runs past the end of the one on show
    // under its own momentum instead of hitting a wall and being stepped.
    const range = buildRange(year, month, day, timeframe, padFor(timeframe));

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
