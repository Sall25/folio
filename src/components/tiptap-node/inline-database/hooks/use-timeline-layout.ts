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
  // Vertical slot from the overlap-packing pass — NOT the record's index in
  // sortedRecords. Two records only share a row when their date ranges don't
  // intersect; overlapping records get pushed into separate rows.
  row: number;
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
  // Total rows needed once overlaps are packed — use this (not
  // sortedRecords.length) to size the gantt body's height.
  rowCount: number;
  startProp: DatabaseProperty | undefined;
  endProp: DatabaseProperty | undefined;
  titleProp: DatabaseProperty | undefined;
  hasEnd: boolean;
  timeframe: Timeframe;
}

export interface UseTimelineLayoutReturn {
  timelineLayout: TimelineLayout;
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

// Rough text-width estimate so overlap packing accounts for titles that will
// visually overflow past their pill (see TimelineCardBody/db-tl-bar__title —
// long titles are allowed to spill past the actual date-range background).
// Without this, two records with non-overlapping DATES can still visually
// collide if one's overflowing title text bleeds into where the next one
// starts. This only affects row assignment, never the rendered pill width.
const AVG_CHAR_PX = 7.5; // rough width per character at 13px/600 weight
const TITLE_OVERHEAD_PX = 40; // icon chip + gaps/padding, see .db-tl-bar__content

function estimateTitleDays(title: string): number {
  const px = title.length * AVG_CHAR_PX + TITLE_OVERHEAD_PX;
  return Math.max(1, Math.ceil(px / DAY_WIDTH));
}

function packRows(records: TimelineRecord[]): Map<ID, number> {
  const rowOf = new Map<ID, number>();
  const rowLastEnd: Date[] = [];

  const withStart = records
    .filter((r): r is TimelineRecord & { start: Date } => r.start != null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  withStart.forEach((rec) => {
    const dateEnd = rec.end ?? rec.start;
    const dateDays =
      Math.round(
        (dateEnd.getTime() - rec.start.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;
    const neededDays = Math.max(dateDays, estimateTitleDays(rec.title));

    const packEnd = new Date(rec.start);
    packEnd.setDate(packEnd.getDate() + neededDays - 1);

    let row = rowLastEnd.findIndex((lastEnd) => lastEnd < rec.start);

    if (row === -1) {
      row = rowLastEnd.length;
      rowLastEnd.push(packEnd);
    } else {
      rowLastEnd[row] = packEnd;
    }

    rowOf.set(rec.id, row);
  });

  return rowOf;
}

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

    const rowOf = packRows(records);
    let rowCount = 0;

    const placement: Record<ID, TimelinePlacement> = {};
    records.forEach((rec) => {
      const geo = getGeo(rec, range, rec.end != null);
      const row = rowOf.get(rec.id);
      if (geo && row != null) {
        placement[rec.id] = { ...geo, row };
        rowCount = Math.max(rowCount, row + 1);
      }
    });

    return {
      range,
      records,
      placement,
      rowCount,
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
