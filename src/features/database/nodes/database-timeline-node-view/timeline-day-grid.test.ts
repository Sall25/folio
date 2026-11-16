import { describe, expect, it } from "vitest";
import {
  buildRange,
  offsetOfTime,
  YEAR_WEEK_WIDTH,
} from "../../hooks/use-timeline-layout";

// Where the grid draws its month divisions.
//
// A month does not begin where a week does, so a division is a position
// and not a column edge. Drawn at the edge, every month reads as a whole
// number of weeks long — which is what this checks it no longer is.

/** What timeline-day-grid draws, as positions. Kept in step with
 *  dividersFor there; the arithmetic under it is offsetOfTime's. */
function dividersFor(range: ReturnType<typeof buildRange>): number[] {
  const out: number[] = [];
  let at = 0;
  range.headerGroups.forEach((group, gi) => {
    const start = at;
    at += group.days;
    if (gi === 0) return;
    const col = range.days[start];
    if (!col) return;
    let boundary = col;
    if (range.unit === "week") {
      const mid = new Date(col);
      mid.setDate(col.getDate() + 3);
      boundary = new Date(mid.getFullYear(), mid.getMonth(), 1);
    }
    out.push(offsetOfTime(range, boundary.getTime()));
  });
  return out;
}

describe("a year's month divisions", () => {
  const range = buildRange(2024, 5, 15, "year");
  const dividers = dividersFor(range);

  /** Where the 1st of `month` is drawn, 0-based month. */
  const at = (month: number) =>
    offsetOfTime(range, new Date(2024, month, 1).getTime());

  it("draws one per month after the first", () => {
    expect(dividers).toHaveLength(11);
  });

  it("puts each one on the first of its month", () => {
    const wanted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(at);
    dividers.forEach((d, i) => expect(d).toBeCloseTo(wanted[i], 6));
  });

  it("lands inside a column when the month opens midweek", () => {
    // 1 August 2024 is a Thursday: three sevenths into the week of the
    // 29th of July. On the column's edge it would be a whole multiple of
    // the width — which is the bug this replaces.
    const x = at(7);
    const columns = x / YEAR_WEEK_WIDTH;
    expect(Number.isInteger(columns)).toBe(false);
    expect(columns % 1).toBeCloseTo(3 / 7, 6);
  });

  it("lands on a column edge when the month opens on a Monday", () => {
    // 1 July 2024 is a Monday, so there the two do coincide.
    expect((at(6) / YEAR_WEEK_WIDTH) % 1).toBeCloseTo(0, 6);
  });

  it("spaces them by the months, not by whole weeks", () => {
    // The spans a reader sees. Were these snapped to column edges every
    // gap would be a multiple of the column width; a month is 4.35 of
    // them, so most gaps must not be.
    const gaps = dividers.slice(1).map((d, i) => d - dividers[i]);
    const whole = gaps.filter(
      (g) => Math.abs((g / YEAR_WEEK_WIDTH) % 1) < 1e-6,
    );
    expect(whole.length).toBeLessThan(gaps.length / 2);
    for (const g of gaps) {
      expect(g / YEAR_WEEK_WIDTH).toBeGreaterThan(3.9);
      expect(g / YEAR_WEEK_WIDTH).toBeLessThan(4.9);
    }
  });

  it("keeps every division inside the grid", () => {
    const width = range.days.length * YEAR_WEEK_WIDTH;
    for (const d of dividers) {
      expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThan(width);
    }
  });
});

describe("a day's date divisions", () => {
  const range = buildRange(2026, 10, 15, "day");
  const dividers = dividersFor(range);

  it("puts one at each midnight, which is a column edge", () => {
    // An hour column does begin where a date does, so here the division
    // and the edge coincide — the same code, no special case.
    expect(dividers).toHaveLength(range.headerGroups.length - 1);
    for (const d of dividers) {
      expect((d / range.cellWidth) % 1).toBeCloseTo(0, 6);
    }
  });
});
