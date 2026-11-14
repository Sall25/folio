import { describe, expect, it } from "vitest";
import {
  DAY_WIDTH,
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
