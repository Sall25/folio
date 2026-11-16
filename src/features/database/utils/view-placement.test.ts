import { describe, expect, it } from "vitest";
import type { DatabaseProperty, DatabaseView } from "src/types";
import { isoDay, placementPropertyId, placementSeed } from "./view-placement";

const prop = (id: string, type: string): DatabaseProperty =>
  ({ id, name: id, config: { type } }) as unknown as DatabaseProperty;

const DATE = prop("p-date", "date");
const DUE = prop("p-due", "date");
const TEXT = prop("p-text", "text");
const PROPS = [TEXT, DATE, DUE];

const view = (v: Partial<DatabaseView> & { type: string }) =>
  v as unknown as DatabaseView;

describe("the date a view places records by", () => {
  it("is a timeline's start property", () => {
    expect(
      placementPropertyId(
        view({ type: "timeline", startDatePropertyId: "p-due" }),
        PROPS,
      ),
    ).toBe("p-due");
  });

  it("is a calendar's date property", () => {
    expect(
      placementPropertyId(
        view({ type: "calendar", datePropertyId: "p-due" }),
        PROPS,
      ),
    ).toBe("p-due");
  });

  it("falls back for a calendar the way the calendar itself does", () => {
    // use-calendar-layout draws by the first date property when the view
    // names none. Seeding another one would put the record somewhere the
    // calendar does not look.
    expect(placementPropertyId(view({ type: "calendar" }), PROPS)).toBe(
      "p-date",
    );
  });

  it("is nothing for a timeline that names no property", () => {
    // Unlike the calendar, a timeline draws nothing at all without one.
    expect(placementPropertyId(view({ type: "timeline" }), PROPS)).toBeNull();
  });

  it("is nothing where every record shows anyway", () => {
    for (const type of ["table", "list", "gallery"] as const) {
      expect(placementPropertyId(view({ type }), PROPS)).toBeNull();
    }
  });

  it("is nothing for a board, which sets its own column after creating", () => {
    expect(placementPropertyId(view({ type: "board" }), PROPS)).toBeNull();
  });

  it("ignores a property that is gone, or is not a date", () => {
    expect(
      placementPropertyId(
        view({ type: "timeline", startDatePropertyId: "deleted" }),
        PROPS,
      ),
    ).toBeNull();
    expect(
      placementPropertyId(
        view({ type: "timeline", startDatePropertyId: "p-text" }),
        PROPS,
      ),
    ).toBeNull();
  });
});

describe("what a new record starts with", () => {
  it("is today, in the property the view places by", () => {
    const seed = placementSeed(
      view({ type: "timeline", startDatePropertyId: "p-due" }),
      PROPS,
      new Date(2026, 10, 15, 9, 30),
    );
    expect(seed).toEqual({ "p-due": { start: "2026-11-15" } });
  });

  it("carries no time, so the bar spans its day", () => {
    // isAllDayValue reads a date with no "T" as the whole day; with one,
    // a new page would be a single hour standing on the minute it was made.
    const seed = placementSeed(
      view({ type: "calendar", datePropertyId: "p-date" }),
      PROPS,
      new Date(2026, 10, 15, 23, 59),
    );
    expect(seed!["p-date"].start).not.toContain("T");
  });

  it("is nothing where the view places by nothing", () => {
    expect(
      placementSeed(view({ type: "table" }), PROPS, new Date()),
    ).toBeNull();
    expect(placementSeed(undefined, PROPS, new Date())).toBeNull();
  });
});

describe("isoDay", () => {
  it("is the local date, not the UTC one", () => {
    // toISOString would say 2026-11-15 for an evening west of Greenwich
    // and 2026-11-16 for a late evening east of it. A record made at
    // 23:30 belongs to the day its maker is living in.
    expect(isoDay(new Date(2026, 10, 15, 23, 30))).toBe("2026-11-15");
    expect(isoDay(new Date(2026, 10, 15, 0, 30))).toBe("2026-11-15");
  });

  it("pads a single-figure month and day", () => {
    expect(isoDay(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
