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

/** What one column stands for. Day is the only timeframe not made of days. */
export type CellUnit = "day" | "hour";

/** How wide one column is, which depends on what a column is. */
export function cellWidthFor(timeframe: Timeframe): number {
  return timeframe === "day" ? HOUR_WIDTH : DAY_WIDTH;
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

  let startDate: Date, endDate: Date;
  switch (timeframe) {
    case "week": {
      const first = new Date(year, month, 1);
      startDate = new Date(first);
      startDate.setDate(first.getDate() - first.getDay());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7 * 8 - 1);
      break;
    }
    case "quarter": {
      const q = Math.floor(month / 3);
      startDate = new Date(year, q * 3, 1);
      endDate = new Date(year, q * 3 + 3, 0);
      break;
    }
    case "year":
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
      break;
    case "month":
    default:
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0);
  }

  const days: Date[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const headerGroups: { label: string; days: number }[] = [];
  if (timeframe === "month") {
    headerGroups.push({
      // No year here: the header adds it after the label, and asking for it
      // twice is what made every month read "Novembre 2026 2026".
      label: startDate.toLocaleString("default", { month: "long" }),
      days: days.length,
    });
  } else if (timeframe === "week" || timeframe === "quarter") {
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const m = cur.getMonth(),
        y = cur.getFullYear();
      let count = 0;
      while (cur <= endDate && cur.getMonth() === m) {
        count++;
        cur.setDate(cur.getDate() + 1);
      }
      headerGroups.push({
        label: new Date(y, m).toLocaleString("default", {
          month: timeframe === "week" ? "short" : "long",
          ...(timeframe === "week" ? { year: "numeric" } : {}),
        }),
        days: count,
      });
    }
  } else if (timeframe === "year") {
    for (let m = 0; m < 12; m++)
      headerGroups.push({
        label: new Date(year, m).toLocaleString("default", { month: "short" }),
        days: new Date(year, m + 1, 0).getDate(),
      });
  }

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

  const inCell = range.unit === "hour" ? sameHour : sameDay;
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
