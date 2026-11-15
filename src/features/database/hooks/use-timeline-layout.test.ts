import { describe, expect, it } from "vitest";
import {
  DAY_WIDTH,
  HOURS_IN_DAY,
  DAYS_IN_WEEK,
  WEEKDAY_WIDTH,
  WEEK_WIDTH,
  MONTH_WIDTH,
  MONTHS_IN_YEAR,
  sameMonth,
  sameWeek,
  startOfWeek,
  stepRange,
  HOUR_WIDTH,
  buildRange,
  cellWidthFor,
  isAllDayValue,
  parseIsoDate,
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
  // Built through parseIsoDate, the way the hook builds them, so these say
  // what a stored value comes to rather than what new Date() makes of it.
  const rec = (
    start: string | null,
    end: string | null,
    allDay = false,
  ): TimelineRecord => ({
    id: "r",
    title: "r",
    start: start ? parseIsoDate(start) : null,
    end: end ? parseIsoDate(end) : null,
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

// ── The Week timeframe ─────────────────────────────────────────────────────
// Week used to be eight weeks of narrow columns, counted from the Sunday
// before the 1st of the month — neither a week nor a month. It is one week
// now, the same shape as Day: one span on screen, a column per part of it.

describe("a week, Monday first", () => {
  // 15 November 2026 is a Sunday: the last day of its week, not the first.
  const range = buildRange(2026, 10, 15, "week");

  it("is seven days", () => {
    expect(range.unit).toBe("weekday");
    expect(range.days).toHaveLength(DAYS_IN_WEEK);
    expect(range.cellWidth).toBe(WEEKDAY_WIDTH);
  });

  it("starts on the Monday and ends on the Sunday", () => {
    expect(range.days[0].getDay()).toBe(1);
    expect(range.days[0].getDate()).toBe(9);
    expect(range.days[6].getDay()).toBe(0);
    expect(range.days[6].getDate()).toBe(15);
  });

  it("holds a Sunday in its own week, not the next one", () => {
    // The old reckoning counted back to Sunday, which put a Sunday at the
    // head of the week after the one it belongs to.
    expect(startOfWeek(new Date(2026, 10, 15)).getDate()).toBe(9);
    expect(startOfWeek(new Date(2026, 10, 9)).getDate()).toBe(9);
    expect(startOfWeek(new Date(2026, 10, 10)).getDate()).toBe(9);
  });

  it("runs to the end of the last day", () => {
    expect(range.endDate.getDate()).toBe(15);
    expect(range.endDate.getHours()).toBe(23);
  });

  it("names the week once, without the year", () => {
    expect(range.headerGroups).toHaveLength(1);
    expect(range.headerGroups[0].days).toBe(DAYS_IN_WEEK);
    expect(range.headerGroups[0].label).toMatch(/9 – 15/);
    expect(range.headerGroups[0].label).not.toMatch(/2026/);
  });

  it("names both months when the week runs across two", () => {
    // 30 November 2026 is a Monday; that week ends in December.
    const across = buildRange(2026, 10, 30, "week");
    expect(across.headerGroups[0].label).toMatch(/30/);
    expect(across.headerGroups[0].label).toMatch(/6/);
    expect(across.headerGroups[0].label.split("–")).toHaveLength(2);
  });

  it("carries itself over the end of a year", () => {
    // 1 January 2027 is a Friday: its week starts the previous December.
    const newYear = buildRange(2027, 0, 1, "week");
    expect(newYear.days[0].getDate()).toBe(28);
    expect(newYear.days[0].getMonth()).toBe(11);
    expect(newYear.days[0].getFullYear()).toBe(2026);
    expect(newYear.days[6].getDate()).toBe(3);
  });

  it("names its columns by the day of the week", () => {
    // Seven columns have room for it, and a week is read that way.
    expect(columnLabel(range.days[0], "weekday")).toMatch(/9$/);
    expect(columnLabel(range.days[0], "weekday").length).toBeGreaterThan(2);
  });

  it("places a bar on the days it covers", () => {
    const geo = getGeo(
      {
        id: "r",
        title: "r",
        start: new Date(2026, 10, 10),
        end: new Date(2026, 10, 12),
        allDay: true,
      },
      range,
      true,
    );
    expect(geo?.left).toBe(1 * WEEKDAY_WIDTH);
    expect(geo?.width).toBe(3 * WEEKDAY_WIDTH);
  });
});

// ── The Quarter timeframe ──────────────────────────────────────────────────
// A quarter was ninety day-columns: 3,600px, four screens of scrolling to
// read three months. A column is a week now, which puts a quarter on one.

describe("a quarter, by the week", () => {
  const range = buildRange(2026, 10, 15, "quarter"); // November → Q4

  it("is the weeks that cover the quarter", () => {
    expect(range.unit).toBe("week");
    expect(range.cellWidth).toBe(WEEK_WIDTH);
    // Q4 2026 runs 1 Oct – 31 Dec; its weeks, Monday-aligned, are 14.
    expect(range.days).toHaveLength(14);
    expect(range.days.every((d) => d.getDay() === 1)).toBe(true);
  });

  it("starts on the Monday on or before the quarter's first day", () => {
    // 1 October 2026 is a Thursday, so the first column is 28 September.
    expect(range.days[0].getDate()).toBe(28);
    expect(range.days[0].getMonth()).toBe(8);
  });

  it("ends with the week holding the quarter's last day", () => {
    // 31 December 2026 is a Thursday; its week begins on the 28th.
    const last = range.days[range.days.length - 1];
    expect(last.getDate()).toBe(28);
    expect(last.getMonth()).toBe(11);
    // And the range runs to the end of that week, not to the 31st: the
    // column is the whole week, so what is drawn and what is in range agree.
    expect(range.endDate.getDate()).toBe(3);
    expect(range.endDate.getMonth()).toBe(0);
  });

  it("names the quarter by its months, without the year", () => {
    expect(range.headerGroups).toHaveLength(1);
    expect(range.headerGroups[0].days).toBe(range.days.length);
    expect(range.headerGroups[0].label).not.toMatch(/2026/);
  });

  it("is the same quarter from any date inside it", () => {
    for (const m of [9, 10, 11]) {
      const r = buildRange(2026, m, 5, "quarter");
      expect(r.days[0].getTime()).toBe(range.days[0].getTime());
    }
  });

  it("labels a column with the Monday it starts on", () => {
    expect(columnLabel(new Date(2026, 9, 12), "week")).toMatch(/^12 /);
  });

  it("puts a bar on the weeks it touches, whole", () => {
    // 12 Oct to 16 Oct is one week: one column, not a sliver of one.
    const geo = getGeo(
      {
        id: "r",
        title: "r",
        start: new Date(2026, 9, 12),
        end: new Date(2026, 9, 16),
        allDay: true,
      },
      range,
      true,
    );
    expect(geo?.width).toBe(WEEK_WIDTH);
    expect(geo?.left).toBe(2 * WEEK_WIDTH); // 28 Sep, 5 Oct, 12 Oct
  });

  it("spans every week a longer record runs through", () => {
    const geo = getGeo(
      {
        id: "r",
        title: "r",
        start: new Date(2026, 9, 12),
        end: new Date(2026, 10, 8),
        allDay: true,
      },
      range,
      true,
    );
    expect(geo?.left).toBe(2 * WEEK_WIDTH);
    expect(geo?.width).toBe(4 * WEEK_WIDTH);
  });

  it("matches a date to its week", () => {
    expect(sameWeek(new Date(2026, 10, 9), new Date(2026, 10, 15))).toBe(true);
    expect(sameWeek(new Date(2026, 10, 15), new Date(2026, 10, 16))).toBe(
      false,
    );
  });
});

// ── The Year timeframe ─────────────────────────────────────────────────────
// A year was 365 day-columns: 14,600px, which is not a year anyone reads.
// A column is a month now, so a year is one screen.

describe("a year, by the month", () => {
  const range = buildRange(2026, 10, 15, "year");

  it("is twelve months", () => {
    expect(range.unit).toBe("month");
    expect(range.cellWidth).toBe(MONTH_WIDTH);
    expect(range.days).toHaveLength(MONTHS_IN_YEAR);
    expect(range.days.map((d) => d.getMonth())).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
    expect(range.days.every((d) => d.getDate() === 1)).toBe(true);
  });

  it("is the same year from any date inside it", () => {
    expect(buildRange(2026, 0, 1, "year").days[0].getTime()).toBe(
      range.days[0].getTime(),
    );
  });

  it("runs to the end of the last day of December", () => {
    expect(range.endDate.getMonth()).toBe(11);
    expect(range.endDate.getDate()).toBe(31);
    expect(range.endDate.getHours()).toBe(23);
  });

  it("says nothing above the months but the year", () => {
    // The header puts the year after the label, so an empty label is the
    // whole of it — and the header must not leave a space in front.
    expect(range.headerGroups).toHaveLength(1);
    expect(range.headerGroups[0].label).toBe("");
    expect(range.headerGroups[0].days).toBe(MONTHS_IN_YEAR);
  });

  it("names a column by its month", () => {
    // Said without a language: this machine's is not the reader's, and
    // January is "janv." on the one this is actually used on. What has to
    // hold is that a column is named rather than numbered, that it is the
    // name of its own month, and that two months do not share one.
    const jan = columnLabel(new Date(2026, 0, 1), "month");
    const dec = columnLabel(new Date(2026, 11, 1), "month");
    expect(jan).toBe(
      new Date(2026, 0, 1).toLocaleDateString(undefined, { month: "short" }),
    );
    expect(jan).not.toMatch(/^\d+$/);
    expect(jan).not.toBe(dec);
  });

  it("puts a bar on the months it runs through", () => {
    const geo = getGeo(
      {
        id: "r",
        title: "r",
        start: new Date(2026, 2, 10),
        end: new Date(2026, 5, 20),
        allDay: true,
      },
      range,
      true,
    );
    expect(geo?.left).toBe(2 * MONTH_WIDTH);
    expect(geo?.width).toBe(4 * MONTH_WIDTH);
  });

  it("gives a record inside one month that month's column, whole", () => {
    const geo = getGeo(
      {
        id: "r",
        title: "r",
        start: new Date(2026, 10, 3),
        end: new Date(2026, 10, 4),
        allDay: true,
      },
      range,
      true,
    );
    expect(geo?.left).toBe(10 * MONTH_WIDTH);
    expect(geo?.width).toBe(MONTH_WIDTH);
  });

  it("leaves out a record from another year", () => {
    expect(
      getGeo(
        {
          id: "r",
          title: "r",
          start: new Date(2027, 1, 1),
          end: new Date(2027, 1, 2),
          allDay: true,
        },
        range,
        true,
      ),
    ).toBeNull();
  });

  it("matches a date to its month", () => {
    expect(sameMonth(new Date(2026, 10, 1), new Date(2026, 10, 30))).toBe(true);
    expect(sameMonth(new Date(2026, 10, 1), new Date(2027, 10, 1))).toBe(false);
  });
});

// ── The arrows ─────────────────────────────────────────────────────────────
// Every step is taken from the date the view is anchored to. Taking it from
// the grid's first column instead is what broke the quarter: its grid starts
// on the Monday before the quarter, which belongs to the quarter before it.

describe("stepping a span at a time", () => {
  const at = (y: number, m: number, d: number) => new Date(y, m, d);
  const parts = (d: Date) => [d.getFullYear(), d.getMonth(), d.getDate()];

  it("moves a day", () => {
    expect(parts(stepRange(at(2026, 10, 15), "day", 1))).toEqual([2026, 10, 16]);
    expect(parts(stepRange(at(2026, 10, 1), "day", -1))).toEqual([2026, 9, 31]);
  });

  it("moves a week", () => {
    expect(parts(stepRange(at(2026, 10, 9), "week", 1))).toEqual([2026, 10, 16]);
    expect(parts(stepRange(at(2026, 10, 2), "week", -1))).toEqual([2026, 9, 26]);
  });

  it("moves a month, landing on the 1st", () => {
    expect(parts(stepRange(at(2026, 0, 31), "month", 1))).toEqual([2026, 1, 1]);
    expect(parts(stepRange(at(2026, 0, 15), "month", -1))).toEqual([
      2025, 11, 1,
    ]);
  });

  it("moves a whole quarter, forwards", () => {
    // The bug: from Q4's grid start (28 September) three months landed in
    // December, which is Q4 again — the arrow did nothing.
    const next = stepRange(at(2026, 10, 15), "quarter", 1);
    expect(Math.floor(next.getMonth() / 3)).toBe(0);
    expect(next.getFullYear()).toBe(2027);
  });

  it("moves exactly one quarter, backwards", () => {
    // And backwards it skipped one: Q4 to Q2.
    const prev = stepRange(at(2026, 10, 15), "quarter", -1);
    expect(Math.floor(prev.getMonth() / 3)).toBe(2);
    expect(prev.getFullYear()).toBe(2026);
  });

  it("lands in the same quarter from any date in it", () => {
    for (const m of [9, 10, 11]) {
      const next = stepRange(at(2026, m, 15), "quarter", 1);
      expect([next.getFullYear(), Math.floor(next.getMonth() / 3)]).toEqual([
        2027, 0,
      ]);
    }
  });

  it("moves a year", () => {
    expect(stepRange(at(2026, 10, 15), "year", 1).getFullYear()).toBe(2027);
    expect(stepRange(at(2026, 10, 15), "year", -1).getFullYear()).toBe(2025);
  });

  it("goes and comes back to the same span", () => {
    // Round-tripping has to land on the span it left, whatever the day.
    for (const tf of ["day", "week", "month", "quarter", "year"] as const) {
      const start = at(2026, 10, 15);
      const there = stepRange(start, tf, 1);
      const back = stepRange(there, tf, -1);
      const a = buildRange(
        back.getFullYear(),
        back.getMonth(),
        back.getDate(),
        tf,
      );
      const b = buildRange(2026, 10, 15, tf);
      expect(a.days[0].getTime()).toBe(b.days[0].getTime());
    }
  });
});

describe("reading a stored date", () => {
  it("takes a date with no time on it as that date, anywhere", () => {
    // new Date("2026-11-01") is midnight UTC, which is the 31st of October
    // for every reader west of Greenwich. A date is not an instant.
    const d = parseIsoDate("2026-11-01");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(10);
    expect(d?.getDate()).toBe(1);
    expect(d?.getHours()).toBe(0);
  });

  it("takes an instant as the instant it is", () => {
    const d = parseIsoDate("2026-11-01T09:30:00.000Z");
    expect(d?.getTime()).toBe(Date.parse("2026-11-01T09:30:00.000Z"));
  });

  it("says nothing for what is not a date", () => {
    expect(parseIsoDate("not a date")).toBeNull();
    expect(parseIsoDate(42)).toBeNull();
    expect(parseIsoDate(null)).toBeNull();
  });
});
