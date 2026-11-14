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

export interface TimelineRecord {
  id: ID;
  title: string;
  start: Date | null;
  end: Date | null;
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
  days: Date[];
  headerGroups: { label: string; days: number }[];
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

/** The day column under a point, clamped to the range on show. */
export function dayAt(x: number, dayCount: number): number {
  return Math.min(dayCount - 1, Math.max(0, Math.floor(x / DAY_WIDTH)));
}

/** The box of a run of days, given two day indexes in either order. */
export function daySpan(
  a: number,
  b: number,
): { left: number; width: number; days: number } {
  const from = Math.min(a, b);
  const to = Math.max(a, b);
  return {
    left: from * DAY_WIDTH,
    width: (to - from + 1) * DAY_WIDTH,
    days: to - from + 1,
  };
}

/** Whether a record's bar already stands on this day. */
export function barCovers(
  placement: TimelinePlacement | undefined,
  dayIndex: number,
): boolean {
  if (!placement) return false;
  const x = dayIndex * DAY_WIDTH;
  return x >= placement.left && x < placement.left + placement.width;
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

function buildRange(
  year: number,
  month: number,
  timeframe: Timeframe,
): TimelineRange {
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
    case "day":
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
  if (timeframe === "month" || timeframe === "day") {
    headerGroups.push({
      label: startDate.toLocaleString("default", {
        month: "long",
        year: "numeric",
      }),
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

  return { startDate, endDate, days, headerGroups };
}

function getGeo(
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

  const cl = rec.start < range.startDate;
  const cr = effEnd > range.endDate;
  const s = cl ? range.startDate : rec.start;
  const e = cr ? range.endDate : effEnd;

  const si = range.days.findIndex((d) => sameDay(d, s));
  const ei = range.days.findIndex((d) => sameDay(d, e));

  const left = (si < 0 ? 0 : si) * DAY_WIDTH;
  const width = Math.max(
    DAY_WIDTH,
    ((ei < 0 ? range.days.length - 1 : ei) - (si < 0 ? 0 : si) + 1) * DAY_WIDTH,
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
    const range = buildRange(year, month, timeframe);

    const records: TimelineRecord[] = sortedRecords.map((r) => {
      const dateValue = parseDateValue(
        startProp ? r.values?.[startProp.id] : null,
      );

      return {
        id: r.id,
        title:
          (titleProp && (r.values?.[titleProp.id] as string)) || "Untitled",
        start: dateValue.start,
        end: dateValue.end,
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
    timeframe,
    startProp,
    endProp,
    titleProp,
    hasEnd,
  ]);

  return { timelineLayout };
}
