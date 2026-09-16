import { useMemo } from "react";
import type {
  CalendarView,
  DataSource,
  DatabaseProperty,
  ID,
  Page,
} from "src/types";
import type { UseDatabaseReturn } from "./use-database";

export interface CalendarSegment {
  row: number;
  colStart: number; // 0-6
  colSpan: number; // 1-7
  track: number; // vertical stack slot within the week, consistent per record
  continuesBefore: boolean; // this segment isn't where the event actually starts
  continuesAfter: boolean; // this segment isn't where the event actually ends
}

export type CalendarPlacement = CalendarSegment[];

export interface CalendarLayout {
  placement: Record<ID, CalendarPlacement>;

  daysInMonth: number;
  firstDow: number;
  totalCell: number;
  rowCount: number;
  weekHeights: number[];

  dateProp: DatabaseProperty | undefined;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function parseIsoDate(iso: unknown): Date | null {
  if (typeof iso !== "string") return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

// Same string | {start, end?} | null shape as CellValueMap.date.
function parseDateRange(value: unknown): {
  start: Date | null;
  end: Date | null;
} {
  if (typeof value === "string") {
    const d = parseIsoDate(value);
    return { start: d, end: d };
  }
  if (typeof value === "object" && value !== null && "start" in value) {
    const raw = value as { start?: unknown; end?: unknown };
    const start = parseIsoDate(raw.start);
    const end = "end" in raw ? (parseIsoDate(raw.end) ?? start) : start;
    return { start, end };
  }
  return { start: null, end: null };
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(
    (stripTime(b).getTime() - stripTime(a).getTime()) / 86_400_000,
  );
}

export const RECORD_HEIGHT = 40;
export const CELL_HEADER_HEIGHT = 40;
export const WEEKDAY_HEADER_HEIGHT = 40;
export const CELL_PADDING = 8;
export const MIN_WEEK_HEIGHT = 140;

export function useCalendarLayout(
  sortedRecords: Page[],
  source: DataSource | null,
  db: UseDatabaseReturn,
  year: number,
  month: number,
): { calendarLayout: CalendarLayout } {
  const activeView = db.activeView as CalendarView | undefined;

  const dateProp = useMemo(() => {
    if (!source || activeView?.type !== "calendar") {
      return undefined;
    }

    if (activeView.datePropertyId) {
      const explicit = source.properties.find(
        (property) =>
          property.id === activeView.datePropertyId &&
          property.config.type === "date",
      );

      if (explicit) return explicit;
    }

    return source.properties.find(
      (property) => property.config.type === "date",
    );
  }, [source, activeView]);

  const calendarLayout = useMemo<CalendarLayout>(() => {
    if (!dateProp) {
      return {
        placement: {},
        rowCount: 0,
        dateProp,
        firstDow: 0,
        totalCell: 0,
        daysInMonth: 0,
        weekHeights: [],
      };
    }

    const daysInMonth = getDaysInMonth(year, month);
    const firstDow = getFirstDayOfWeek(year, month);
    const totalCell = Math.ceil((firstDow + daysInMonth) / 7) * 7;
    const rowCount = totalCell / 7;

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    const gridStart = new Date(monthStart);
    gridStart.setDate(gridStart.getDate() - firstDow);
    const gridEnd = new Date(gridStart);
    gridEnd.setDate(gridEnd.getDate() + totalCell - 1);

    // Resolve each record's [start, end], clipped to whether it intersects
    // the visible grid window at all (still-in-range check, not per-week/
    // per-month yet).
    const ranges: { id: string; start: Date; end: Date }[] = [];
    for (const record of sortedRecords) {
      const raw = record.values?.[dateProp.id];
      const { start, end } = parseDateRange(raw);
      if (!start) continue;
      const effEnd = end ?? start;
      if (effEnd < gridStart || start > gridEnd) continue;
      ranges.push({ id: record.id, start, end: effEnd });
    }

    // ── Track assignment: ONE track per record, over its FULL range (not
    // per-week) — greedy interval packing, same technique as timeline's
    // packRows. This keeps a multi-week event in the same visual row as it
    // continues from week to week instead of reshuffling per row. ─────────
    const trackOf = new Map<string, number>();
    const trackLastEnd: Date[] = [];
    [...ranges]
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .forEach(({ id, start, end }) => {
        let track = trackLastEnd.findIndex((lastEnd) => lastEnd < start);
        if (track === -1) {
          track = trackLastEnd.length;
          trackLastEnd.push(end);
        } else {
          trackLastEnd[track] = end;
        }
        trackOf.set(id, track);
      });

    // ── Emit one segment per week row the record's range intersects,
    // clipped to BOTH the week row AND the actual viewed month — padding
    // cells (days from the adjacent month shown to fill the grid) render no
    // date/content in CalendarCell, so a segment must never extend into
    // them. continuesBefore/After reflect whether the record's real dates
    // extend past what's actually drawn, for whichever reason (a previous
    // week, or before/after the month itself). ───────────────────────────
    const placement: Record<ID, CalendarPlacement> = {};
    const maxTrackByRow = new Map<number, number>();

    ranges.forEach(({ id, start, end }) => {
      const track = trackOf.get(id) ?? 0;
      const segments: CalendarSegment[] = [];

      for (let row = 0; row < rowCount; row++) {
        const weekStart = new Date(gridStart);
        weekStart.setDate(weekStart.getDate() + row * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const lowerBound = weekStart > monthStart ? weekStart : monthStart;
        const upperBound = weekEnd < monthEnd ? weekEnd : monthEnd;

        if (end < lowerBound || start > upperBound) continue;

        const segStart = start < lowerBound ? lowerBound : start;
        const segEnd = end > upperBound ? upperBound : end;

        if (segStart > segEnd) continue;

        segments.push({
          row,
          colStart: daysBetween(weekStart, segStart),
          colSpan: daysBetween(segStart, segEnd) + 1,
          track,
          continuesBefore: start < segStart,
          continuesAfter: end > segEnd,
        });

        maxTrackByRow.set(row, Math.max(maxTrackByRow.get(row) ?? -1, track));
      }

      if (segments.length) placement[id] = segments;
    });

    const weekHeights: number[] = [];
    for (let row = 0; row < rowCount; row++) {
      const maxTrack = maxTrackByRow.get(row) ?? -1;
      weekHeights.push(
        Math.max(
          MIN_WEEK_HEIGHT,
          CELL_HEADER_HEIGHT + CELL_PADDING + (maxTrack + 1) * RECORD_HEIGHT,
        ),
      );
    }

    return {
      placement,
      rowCount,
      dateProp,
      daysInMonth,
      firstDow,
      totalCell,
      weekHeights,
    };
  }, [sortedRecords, dateProp, year, month]);

  return { calendarLayout };
}
