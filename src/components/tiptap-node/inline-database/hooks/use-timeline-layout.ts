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
): TimelinePlacement | null {
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

export function useTimelineLayout(
  sortedRecords: Page[],
  source: DataSource | null,
  db: UseDatabaseReturn,
  year: number,
  month: number,
): { timelineLayout: TimelineLayout } {
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

    const records: TimelineRecord[] = sortedRecords.map((r) => ({
      id: r.id,
      title: (titleProp && (r.values?.[titleProp.id] as string)) || "Untitled",
      start: parseIsoDate(startProp ? r.values?.[startProp.id] : null),
      end: parseIsoDate(endProp ? r.values?.[endProp.id] : null),
    }));

    const placement: Record<ID, TimelinePlacement> = {};
    records.forEach((rec) => {
      const geo = getGeo(rec, range, hasEnd);
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
