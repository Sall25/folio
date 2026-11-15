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
export const HOUR_WIDTH = 56;
/** What the Day timeframe shows: one date, an hour to a column. */
export const HOURS_IN_DAY = 24;
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

/** How wide one column is, which depends on what a column is. */
export function cellWidthFor(timeframe: Timeframe): number {
  if (timeframe === "day") return HOUR_WIDTH;
  if (timeframe === "week") return WEEKDAY_WIDTH;
  if (timeframe === "quarter") return WEEK_WIDTH;
  if (timeframe === "year") return MONTH_WIDTH;
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
export function stepRange(anchor: Date, timeframe: Timeframe, dir: -1 | 1): Date {
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
export function columnLabel(d: Date, unit: CellUnit): string {
  if (unit === "hour") return `${String(d.getHours()).padStart(2, "0")}:00`;
  if (unit === "month") {
    return d.toLocaleDateString(undefined, { month: "short" });
  }
  if (unit === "week") {
    // The Monday it starts on. A quarter is read by where in it a thing
    // falls, and a date says that better than a week number does.
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
    const startDate = new Date(year, month, day, 0, 0, 0, 0);
    const endDate = new Date(year, month, day, 23, 59, 59, 999);
    const hours = Array.from(
      { length: HOURS_IN_DAY },
      (_, h) => new Date(year, month, day, h),
    );
    return {
      startDate,
      endDate,
      days: hours,
      // The header puts the year after the label, so it is left out here.
      headerGroups: [
        {
          label: startDate.toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
          }),
          days: HOURS_IN_DAY,
        },
      ],
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
        { label: `${monthName(first)} – ${monthName(lastDay)}`, days: days.length },
      ],
      unit: "week",
      cellWidth: WEEK_WIDTH,
    };
  }

  // A year, a month to a column. Three hundred and sixty-five day-columns
  // came to 14,600px, which is not a year anyone could read.
  if (timeframe === "year") {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    return {
      startDate,
      endDate,
      days: Array.from(
        { length: MONTHS_IN_YEAR },
        (_, m) => new Date(year, m, 1),
      ),
      // Nothing to say but the year, which the header puts after this.
      headerGroups: [{ label: "", days: MONTHS_IN_YEAR }],
      unit: "month",
      cellWidth: MONTH_WIDTH,
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
    return {
      left: 0,
      width: range.days.length * w,
      clippedLeft: false,
      clippedRight: false,
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
