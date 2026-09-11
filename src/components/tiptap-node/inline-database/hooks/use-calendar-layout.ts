import { useMemo } from "react";

import type {
  CalendarView,
  DataSource,
  DatabaseProperty,
  ID,
  Page,
} from "src/types";

import type { UseDatabaseReturn } from "./use-database";

export interface CalendarPlacement {
  col: number;
  row: number;
  day: number;
  indexInDay: number;
}

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

function isoToLocalDate(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return null;

  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
  };
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

  const manualOrder = activeView?.manualOrder;

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

    // Manual order (flat, same convention as board/gallery) — records
    // unlisted keep their existing sorted order within the day.
    const orderIndex = new Map<string, number>();
    (manualOrder ?? []).forEach((id, i) => orderIndex.set(id, i));

    // Group records by day first, so manual order can be applied per-day.
    const recordsByDay = new Map<number, Page[]>();
    for (const record of sortedRecords) {
      const raw = record.values?.[dateProp.id];

      if (typeof raw !== "string" || !raw) continue;

      const parsed = isoToLocalDate(raw);

      if (!parsed) continue;

      if (parsed.year !== year || parsed.month !== month) {
        continue;
      }

      const list = recordsByDay.get(parsed.day) ?? [];
      list.push(record);
      recordsByDay.set(parsed.day, list);
    }

    const placement: Record<ID, CalendarPlacement> = {};
    const recordCountByDay = new Map<number, number>();

    recordsByDay.forEach((records, day) => {
      const dayIndex = firstDow + day - 1;
      const col = dayIndex % 7;
      const row = Math.floor(dayIndex / 7) - 1;

      const sorted = [...records].sort((a, b) => {
        const ia = orderIndex.get(a.id) ?? Infinity;
        const ib = orderIndex.get(b.id) ?? Infinity;
        return ia - ib;
      });

      sorted.forEach((record, indexInDay) => {
        placement[record.id] = { col, row, day, indexInDay };
      });

      recordCountByDay.set(day, sorted.length);
    });

    const weeks = [];

    for (let index = 0; index < totalCell; index += 7) {
      weeks.push(
        Array.from({ length: 7 }, (_, column) => {
          const cellIndex = index + column;
          const day = cellIndex - firstDow + 1;

          return {
            column,
            day: day >= 1 && day <= daysInMonth ? day : null,
          };
        }),
      );
    }

    const weekHeights = weeks.map((week) => {
      const maxRecords = Math.max(
        ...week.map((cell) => {
          if (cell.day == null) return 0;

          return recordCountByDay.get(cell.day) ?? 0;
        }),
      );

      return Math.max(
        MIN_WEEK_HEIGHT,
        CELL_HEADER_HEIGHT + CELL_PADDING + maxRecords * RECORD_HEIGHT,
      );
    });

    return {
      placement,
      rowCount,
      dateProp,
      daysInMonth,
      firstDow,
      totalCell,
      weekHeights,
    };
  }, [sortedRecords, dateProp, year, month, manualOrder]);

  return { calendarLayout };
}
