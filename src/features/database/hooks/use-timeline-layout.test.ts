import { describe, expect, it } from "vitest";
import {
  DAY_WIDTH,
  HOURS_IN_DAY,
  HOUR_WIDTH,
  buildRange,
  cellWidthFor,
  isAllDayValue,
  getGeo,
  columnLabel,
  MIN_GRID_WIDTH,
  MIN_TABLE_WIDTH,
  ROW_HEIGHT,
  barCovers,
  clampTableWidth,
  dayAt,
  daySpan,
  rowAt,
  rowTop,
  type TimelinePlacement,
  type TimelineRecord,
} from "./use-timeline-layout";

// The gantt body's geometry. The bars and the new-page placeholder both read
// their row and their day from these, so if they ever disagree a placeholder
// lands on a different line from the record it is beside.

const placement = (left: number, width: number): TimelinePlacement => ({
  left,
  width,
  clippedLeft: false,
  clippedRight: false,
});

describe("rows", () => {
  it("starts the first record at the top of the body", () => {
    // Both headers are the same height, so the name table's first row and
    // the gantt's first row are level: record 0 belongs at 0, not one row
    // down.
    expect(rowTop(0)).toBe(0);
  });

  it("gives every record its own line", () => {
    expect(rowTop(1)).toBe(ROW_HEIGHT);
    expect(rowTop(4)).toBe(4 * ROW_HEIGHT);
    expect(new Set([0, 1, 2, 3].map(rowTop)).size).toBe(4);
  });

  it("finds the row under a point", () => {
    expect(rowAt(0, 4)).toBe(0);
    expect(rowAt(ROW_HEIGHT - 1, 4)).toBe(0);
    expect(rowAt(ROW_HEIGHT, 4)).toBe(1);
    expect(rowAt(ROW_HEIGHT * 2.5, 4)).toBe(2);
  });

  it("stays inside the rows that exist", () => {
    expect(rowAt(-40, 4)).toBe(0);
    expect(rowAt(ROW_HEIGHT * 99, 4)).toBe(3);
  });

  it("agrees with itself: the row under a row's own top is that row", () => {
    for (let i = 0; i < 6; i += 1) expect(rowAt(rowTop(i), 6)).toBe(i);
  });
});

describe("days", () => {
  it("finds the day under a point", () => {
    expect(dayAt(0, 31)).toBe(0);
    expect(dayAt(DAY_WIDTH - 1, 31)).toBe(0);
    expect(dayAt(DAY_WIDTH, 31)).toBe(1);
    expect(dayAt(DAY_WIDTH * 10 + 5, 31)).toBe(10);
  });

  it("stays inside the month on show", () => {
    expect(dayAt(-10, 31)).toBe(0);
    expect(dayAt(DAY_WIDTH * 400, 31)).toBe(30);
  });
});

describe("daySpan", () => {
  it("is one day wide for a single day", () => {
    expect(daySpan(3, 3)).toEqual({
      left: 3 * DAY_WIDTH,
      width: DAY_WIDTH,
      days: 1,
    });
  });

  it("covers both ends of a run", () => {
    expect(daySpan(2, 5)).toEqual({
      left: 2 * DAY_WIDTH,
      width: 4 * DAY_WIDTH,
      days: 4,
    });
  });

  it("reads a backwards drag the same as a forwards one", () => {
    // Dragging right to left is the same span, not a negative one.
    expect(daySpan(5, 2)).toEqual(daySpan(2, 5));
  });
});

describe("barCovers", () => {
  const bar = placement(DAY_WIDTH * 3, DAY_WIDTH * 2); // days 3 and 4

  it("knows the days its bar stands on", () => {
    expect(barCovers(bar, 3)).toBe(true);
    expect(barCovers(bar, 4)).toBe(true);
  });

  it("leaves the days either side free", () => {
    expect(barCovers(bar, 2)).toBe(false);
    expect(barCovers(bar, 5)).toBe(false);
  });

  it("treats a record with no bar as covering nothing", () => {
    expect(barCovers(undefined, 3)).toBe(false);
  });
});

describe("the separator between the table and the grid", () => {
  const FRAME = 900;

  it("keeps the width it is dragged to", () => {
    expect(clampTableWidth(420, FRAME)).toBe(420);
  });

  it("rounds to whole pixels", () => {
    expect(clampTableWidth(419.6, FRAME)).toBe(420);
  });

  it("won't let the table shrink past a name", () => {
    expect(clampTableWidth(10, FRAME)).toBe(MIN_TABLE_WIDTH);
    expect(clampTableWidth(-200, FRAME)).toBe(MIN_TABLE_WIDTH);
  });

  it("won't let the table swallow the grid", () => {
    // Dragged to the far right: the grid keeps its minimum.
    expect(clampTableWidth(FRAME, FRAME)).toBe(FRAME - MIN_GRID_WIDTH);
    expect(clampTableWidth(FRAME + 500, FRAME)).toBe(FRAME - MIN_GRID_WIDTH);
  });

  it("gives the table its minimum even in a frame too small for both", () => {
    // A narrow window: something has to give, and it isn't the names.
    expect(clampTableWidth(300, 200)).toBe(MIN_TABLE_WIDTH);
    expect(clampTableWidth(10, 200)).toBe(MIN_TABLE_WIDTH);
  });

  it("is stable: clamping a clamped width changes nothing", () => {
    const once = clampTableWidth(5000, FRAME);
    expect(clampTableWidth(once, FRAME)).toBe(once);
  });
});

// ── The Day timeframe ──────────────────────────────────────────────────────
// Day used to be an alias for month: same whole-month range, same columns,
// so picking it changed nothing on screen. A day is now its own thing —
// one date, an hour to a column — and the rest of the grid reads what a
// column is off the range rather than assuming a day.

describe("a day, by the hour", () => {
  const range = buildRange(2026, 10, 15, "day"); // 15 November 2026

  it("is one date, an hour at a time", () => {
    expect(range.unit).toBe("hour");
    expect(range.days).toHaveLength(HOURS_IN_DAY);
    expect(range.days[0].getHours()).toBe(0);
    expect(range.days[23].getHours()).toBe(23);
    expect(range.days.every((d) => d.getDate() === 15)).toBe(true);
  });

  it("gives an hour more room than a day gets", () => {
    // 24 of them have to fit on screen, and a time goes under the title.
    expect(range.cellWidth).toBe(HOUR_WIDTH);
    expect(cellWidthFor("day")).toBe(HOUR_WIDTH);
    expect(cellWidthFor("month")).toBe(DAY_WIDTH);
  });

  it("runs to the end of the last hour", () => {
    // Not to 23:00: a record at 23:30 is still that day.
    expect(range.endDate.getHours()).toBe(23);
    expect(range.endDate.getMinutes()).toBe(59);
  });

  it("names the date once, without the year", () => {
    // The header puts the year after the label. Asking for it here too is
    // what made a month read "Novembre 2026 2026".
    expect(range.headerGroups).toHaveLength(1);
    expect(range.headerGroups[0].days).toBe(HOURS_IN_DAY);
    expect(range.headerGroups[0].label).not.toMatch(/2026/);
  });
});

describe("a month, by the day", () => {
  const range = buildRange(2026, 10, 15, "month");

  it("is unchanged by any of this", () => {
    expect(range.unit).toBe("day");
    expect(range.cellWidth).toBe(DAY_WIDTH);
    expect(range.days).toHaveLength(30);
  });

  it("names the month without the year", () => {
    expect(range.headerGroups[0].label).not.toMatch(/2026/);
  });
});

describe("telling a date from an instant", () => {
  it("knows a date with no time on it", () => {
    expect(isAllDayValue("2026-11-01")).toBe(true);
    expect(isAllDayValue({ start: "2026-11-01" })).toBe(true);
  });

  it("knows one that has", () => {
    expect(isAllDayValue("2026-11-01T09:30:00.000Z")).toBe(false);
    expect(isAllDayValue({ start: "2026-11-01T09:30:00.000Z" })).toBe(false);
  });

  it("says no to anything else", () => {
    expect(isAllDayValue(null)).toBe(false);
    expect(isAllDayValue(undefined)).toBe(false);
    expect(isAllDayValue(42)).toBe(false);
  });
});

describe("columns, at either width", () => {
  it("finds the hour under a point", () => {
    expect(dayAt(0, 24, HOUR_WIDTH)).toBe(0);
    expect(dayAt(HOUR_WIDTH * 9 + 5, 24, HOUR_WIDTH)).toBe(9);
    expect(dayAt(HOUR_WIDTH * 99, 24, HOUR_WIDTH)).toBe(23);
  });

  it("spans a run of hours", () => {
    expect(daySpan(9, 11, HOUR_WIDTH)).toEqual({
      left: 9 * HOUR_WIDTH,
      width: 3 * HOUR_WIDTH,
      days: 3,
    });
  });

  it("still means days when nothing says otherwise", () => {
    // Every caller that has not been told about hours keeps its old answer.
    expect(dayAt(DAY_WIDTH * 3, 31)).toBe(3);
    expect(daySpan(2, 5).width).toBe(4 * DAY_WIDTH);
  });
});

describe("where a bar sits in a day", () => {
  const range = buildRange(2026, 10, 15, "day");
  const rec = (
    start: string | null,
    end: string | null,
    allDay = false,
  ): TimelineRecord => ({
    id: "r",
    title: "r",
    start: start ? new Date(start) : null,
    end: end ? new Date(end) : null,
    allDay,
  });

  it("stands on the hours it covers", () => {
    // 09:00 to 12:00 is four columns, the way 1 to 4 November is four days.
    const geo = getGeo(
      rec("2026-11-15T09:00:00", "2026-11-15T12:00:00"),
      range,
      true,
    );
    expect(geo).toEqual({
      left: 9 * HOUR_WIDTH,
      width: 4 * HOUR_WIDTH,
      clippedLeft: false,
      clippedRight: false,
    });
  });

  it("is an hour wide when it has no end", () => {
    const geo = getGeo(rec("2026-11-15T14:00:00", null), range, false);
    expect(geo?.left).toBe(14 * HOUR_WIDTH);
    expect(geo?.width).toBe(HOUR_WIDTH);
  });

  it("spans the day when the date carries no time", () => {
    // Otherwise everything dated plainly would pile up on midnight.
    const geo = getGeo(rec("2026-11-15", "2026-11-15", true), range, true);
    expect(geo).toEqual({
      left: 0,
      width: HOURS_IN_DAY * HOUR_WIDTH,
      clippedLeft: false,
      clippedRight: false,
    });
  });

  it("leaves out a record from another date", () => {
    expect(
      getGeo(rec("2026-11-16T09:00:00", "2026-11-16T10:00:00"), range, true),
    ).toBeNull();
  });

  it("marks a bar that runs past either end of the day", () => {
    const geo = getGeo(
      rec("2026-11-14T22:00:00", "2026-11-16T02:00:00"),
      range,
      true,
    );
    expect(geo?.clippedLeft).toBe(true);
    expect(geo?.clippedRight).toBe(true);
    expect(geo?.left).toBe(0);
    expect(geo?.width).toBe(HOURS_IN_DAY * HOUR_WIDTH);
  });

  it("places a bar by the day when the range is days", () => {
    const month = buildRange(2026, 10, 15, "month");
    const geo = getGeo(rec("2026-11-03", "2026-11-05", true), month, true);
    expect(geo?.left).toBe(2 * DAY_WIDTH);
    expect(geo?.width).toBe(3 * DAY_WIDTH);
  });
});

describe("what a column is called", () => {
  it("names an hour with its unit", () => {
    // "09", in a view where every column is the same date, reads as a date.
    expect(columnLabel(new Date(2026, 10, 15, 9), "hour")).toBe("09:00");
    expect(columnLabel(new Date(2026, 10, 15, 0), "hour")).toBe("00:00");
    expect(columnLabel(new Date(2026, 10, 15, 23), "hour")).toBe("23:00");
  });

  it("names a day with its date, as it always did", () => {
    expect(columnLabel(new Date(2026, 10, 15), "day")).toBe("15");
    expect(columnLabel(new Date(2026, 10, 1), "day")).toBe("1");
  });
});
