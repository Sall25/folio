import { describe, expect, it } from "vitest";
import type {
  CalendarView,
  DatabaseProperty,
  DatabaseView,
  Page,
  TimelineView,
} from "src/types";
import {
  calendarViewFor,
  dateForCalendar,
  unscheduledRecords,
} from "./manage-in-calendar";

const calendar = (id: string, datePropertyId: string) =>
  ({ id, name: id, type: "calendar", datePropertyId }) as CalendarView;
const timeline = (startDatePropertyId: string) =>
  ({
    id: "tl",
    name: "Timeline",
    type: "timeline",
    startDatePropertyId,
    endDatePropertyId: "end",
    timeframe: "month",
  }) as TimelineView;
const table = { id: "t", name: "Table", type: "table" } as DatabaseView;

describe("which calendar a timeline opens", () => {
  it("is the one standing on the same dates", () => {
    const views = [
      table,
      calendar("other", "shipped"),
      calendar("same", "due"),
    ];
    expect(calendarViewFor(views, timeline("due"))?.id).toBe("same");
  });

  it("is the first one there when none match", () => {
    const views = [
      table,
      calendar("first", "shipped"),
      calendar("second", "x"),
    ];
    expect(calendarViewFor(views, timeline("due"))?.id).toBe("first");
  });

  it("is none when the database has no calendar", () => {
    expect(calendarViewFor([table], timeline("due"))).toBeNull();
  });
});

describe("the dates a new calendar stands on", () => {
  const props = [
    { id: "due", name: "Due", config: { type: "date" } },
    { id: "shipped", name: "Shipped", config: { type: "date" } },
    { id: "name", name: "Name", config: { type: "title" } },
  ] as DatabaseProperty[];

  it("are the timeline's own", () => {
    expect(dateForCalendar(props, timeline("shipped"))).toBe("shipped");
  });

  it("fall back to the first date there", () => {
    // The timeline's property was deleted, or it never had one.
    expect(dateForCalendar(props, timeline("gone"))).toBe("due");
    expect(dateForCalendar(props, undefined)).toBe("due");
  });

  it("are nothing at all without a date property", () => {
    expect(dateForCalendar([props[2]], timeline("due"))).toBeNull();
  });
});

describe("the records a calendar cannot place", () => {
  const rows = [
    { id: "a", values: { due: "2026-11-02" } },
    { id: "b", values: {} },
    { id: "c", values: { due: "" } },
    { id: "d", values: { due: { start: "2026-11-05", end: "2026-11-09" } } },
    { id: "e", values: { due: { end: "2026-11-09" } } },
    { id: "f", values: { due: null } },
  ] as unknown as Page[];

  it("are the ones with no date to sit on", () => {
    // Including a date object with an end but no start: nothing to begin on.
    expect(unscheduledRecords(rows, "due").map((r) => r.id)).toEqual([
      "b",
      "c",
      "e",
      "f",
    ]);
  });

  it("are none at all when there is no date property", () => {
    expect(unscheduledRecords(rows, null)).toEqual([]);
  });
});
