import { describe, expect, it } from "vitest";
import {
  type Timeframe,
  type TimelineRange,
  DAY_WIDTH,
  HOURS_IN_DAY,
  HOURS_SPAN,
  timeAtOffset,
  offsetOfTime,
  DAY_LEAD_HOURS,
  DAYS_IN_WEEK,
  WEEKDAY_WIDTH,
  WEEK_WIDTH,
  YEAR_WEEK_WIDTH,
  sameMonth,
  sameWeek,
  sameHour,
  sameDay,
  startOfWeek,
  stepRange,
  shiftDate,
  dropBeforeId,
  unitFor,
  HOUR_WIDTH,
  buildRange as buildRangeFresh,
  endForGrains,
  grainWidth,
  holdBar,
  barCaughtUp,
  MIN_BAR_WIDTH,
  parseDateValue,
  padFor,
  columnWindow,
  WINDOW_BLOCK,
  headerGroupsFor,
  cellWidthFor,
  isAllDayValue,
  parseIsoDate,
  getGeo,
  columnLabel,
  columnParts,
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

/**
 * The first column that breaks a rule, told in a way a failure can print —
 * or null when none does.
 *
 * A range is thousands of columns wide (a Day range is a year of hours), so
 * an expect() per column is tens of thousands of them: seconds of matcher
 * bookkeeping that says nothing the first offender doesn't, and long enough
 * to time a test out on a slower machine than the one it was written on.
 */
function firstBreak<T>(
  items: T[],
  holds: (item: T, i: number) => boolean,
  tell: (item: T, i: number) => Record<string, unknown>,
): Record<string, unknown> | null {
  for (let i = 0; i < items.length; i++)
    if (!holds(items[i], i)) return { at: i, ...tell(items[i], i) };
  return null;
}

/**
 * buildRange, remembered between tests.
 *
 * A padded range is thousands of Dates — a Day range is a year of hours —
 * and this file builds the same few dozen of them over and over. The ranges
 * are read, never written, so one of each is enough, and the file runs in a
 * fraction of the time on a slower machine than this one.
 */
const BUILT = new Map<string, ReturnType<typeof buildRangeFresh>>();
function buildRange(
  ...args: Parameters<typeof buildRangeFresh>
): ReturnType<typeof buildRangeFresh> {
  const key = JSON.stringify(args);
  const had = BUILT.get(key);
  if (had) return had;
  const made = buildRangeFresh(...args);
  BUILT.set(key, made);
  return made;
}

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

  it("is the date and the hours either side, an hour at a time", () => {
    expect(range.unit).toBe("hour");
    expect(range.days).toHaveLength(HOURS_SPAN);
    // It opens before the date and ends after it, with the date centred.
    expect(range.days[0].getDate()).toBe(14);
    expect(range.days[0].getHours()).toBe(DAY_LEAD_HOURS);
    expect(range.days[DAY_LEAD_HOURS].getDate()).toBe(15);
    expect(range.days[DAY_LEAD_HOURS].getHours()).toBe(0);
    expect(range.days[HOURS_SPAN - 1].getDate()).toBe(16);
  });

  it("gives the date on show a full 24 of those columns", () => {
    const onTheDay = range.days.filter((d) => d.getDate() === 15);
    expect(onTheDay).toHaveLength(HOURS_IN_DAY);
  });

  it("walks the clock without repeating or skipping an hour", () => {
    // setHours carries past midnight; new Date(y, m, d, h) would not.
    const hours = range.days.map((d) => d.getHours());
    expect(hours).toEqual(
      Array.from({ length: HOURS_SPAN }, (_, i) => (DAY_LEAD_HOURS + i) % 24),
    );
  });

  it("gives an hour more room than a day gets", () => {
    // 24 of them have to fit on screen, and a time goes under the title.
    expect(range.cellWidth).toBe(HOUR_WIDTH);
    expect(cellWidthFor("day")).toBe(HOUR_WIDTH);
    expect(cellWidthFor("month")).toBe(DAY_WIDTH);
  });

  it("runs to the end of the last hour", () => {
    // Not to the hour's start: a record at 11:30 is still inside it.
    expect(range.endDate.getDate()).toBe(16);
    expect(range.endDate.getHours()).toBe(DAY_LEAD_HOURS - 1);
    expect(range.endDate.getMinutes()).toBe(59);
  });

  it("names every date the span touches", () => {
    expect(range.headerGroups).toHaveLength(3);
    expect(range.headerGroups.map((g) => g.days)).toEqual([
      DAY_LEAD_HOURS,
      HOURS_IN_DAY,
      DAY_LEAD_HOURS,
    ]);
    expect(range.headerGroups.reduce((n, g) => n + g.days, 0)).toBe(HOURS_SPAN);
  });

  it("knows the year of every date without saying it", () => {
    // The heading itself names the date; its year waits in full, for the
    // one heading the view has pinned at the left. The locale writes the
    // year in, so the header appends none of its own — a second would
    // read "15 novembre 2026 2026".
    expect(range.labelsCarryYear).toBe(true);
    for (const g of range.headerGroups) {
      expect(g.label).not.toMatch(/2026/);
      expect(g.full).toMatch(/2026/);
      expect(g.full).toContain(g.label);
    }
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
      left: (DAY_LEAD_HOURS + 9) * HOUR_WIDTH,
      width: 4 * HOUR_WIDTH,
      clippedLeft: false,
      clippedRight: false,
    });
  });

  it("is an hour wide when it has no end", () => {
    const geo = getGeo(rec("2026-11-15T14:00:00", null), range, false);
    expect(geo?.left).toBe((DAY_LEAD_HOURS + 14) * HOUR_WIDTH);
    expect(geo?.width).toBe(HOUR_WIDTH);
  });

  it("spans its own day when the date carries no time", () => {
    // Otherwise everything dated plainly would pile up on midnight — and
    // it is ITS day, not the whole span, which now reaches either side.
    const geo = getGeo(rec("2026-11-15", "2026-11-15", true), range, true);
    expect(geo).toEqual({
      left: DAY_LEAD_HOURS * HOUR_WIDTH,
      width: HOURS_IN_DAY * HOUR_WIDTH,
      clippedLeft: false,
      clippedRight: false,
    });
  });

  it("ends an all-day record on its last hour, not its first", () => {
    // findIndex gives the FIRST column of the end date, which made a whole
    // day come out one hour wide.
    const geo = getGeo(rec("2026-11-14", "2026-11-16", true), range, true);
    expect(geo?.width).toBe(HOURS_SPAN * HOUR_WIDTH);
    // Both dates reach past the span, so both ends are marked.
    expect(geo?.clippedLeft).toBe(true);
    expect(geo?.clippedRight).toBe(true);
  });

  it("shows a record from the hours either side of the date", () => {
    // The point of the wider span: work that runs into the next morning is
    // there to scroll to rather than cut off at midnight.
    const geo = getGeo(
      rec("2026-11-16T09:00:00", "2026-11-16T10:00:00"),
      range,
      true,
    );
    expect(geo?.left).toBe((DAY_LEAD_HOURS + HOURS_IN_DAY + 9) * HOUR_WIDTH);
  });

  it("leaves out a record past either end of the span", () => {
    expect(
      getGeo(rec("2026-11-18T09:00:00", "2026-11-18T10:00:00"), range, true),
    ).toBeNull();
    expect(
      getGeo(rec("2026-11-12T09:00:00", "2026-11-12T10:00:00"), range, true),
    ).toBeNull();
  });

  it("marks a bar that runs past either end of the day", () => {
    const geo = getGeo(
      rec("2026-11-13T22:00:00", "2026-11-17T02:00:00"),
      range,
      true,
    );
    expect(geo?.clippedLeft).toBe(true);
    expect(geo?.clippedRight).toBe(true);
    expect(geo?.left).toBe(0);
    expect(geo?.width).toBe(HOURS_SPAN * HOUR_WIDTH);
  });

  it("places a bar by the day when the range is days", () => {
    const month = buildRange(2026, 10, 15, "month");
    const geo = getGeo(rec("2026-11-03", "2026-11-05", true), month, true);
    expect(geo?.left).toBe(2 * DAY_WIDTH);
    expect(geo?.width).toBe(3 * DAY_WIDTH);
  });
});

describe("what a column is called", () => {
  it("names an hour the way the locale tells it", () => {
    // Not a hardcoded "09:00": en reads an hour as 9 AM, fr as 09 h. What
    // matters is that it is the hour, and that the three differ.
    const at = (h: number) => columnLabel(new Date(2026, 10, 15, h), "hour");
    const nine = at(9);
    expect(nine).toMatch(/9/);
    expect(at(0)).not.toBe(nine);
    expect(at(23)).not.toBe(nine);
    // An hour, never a date: twenty-four columns, twenty-four names, and
    // the same hour reads the same whatever day it falls on. (Not "15
    // cannot read as 15" — in a locale that keeps a 24-hour clock, it is
    // exactly what three in the afternoon is called.)
    const everyHour = Array.from({ length: 24 }, (_, h) => at(h));
    expect(new Set(everyHour).size).toBe(24);
    expect(columnLabel(new Date(2027, 0, 2, 15), "hour")).toBe(at(15));
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

  it("names the month above the week, with its year held in reserve", () => {
    // The dates are under every column already, so the heading names the
    // month rather than repeating the span the columns spell out. The year
    // goes on it only while it leads, which here it does: there is one.
    expect(range.labelsCarryYear).toBe(true);
    expect(range.headerGroups).toHaveLength(1);
    expect(range.headerGroups[0].days).toBe(DAYS_IN_WEEK);
    expect(range.headerGroups[0].label).not.toMatch(/2026/);
    expect(range.headerGroups[0].full).toMatch(/2026/);
  });

  it("names both months when the week runs across two", () => {
    // 30 November 2026 is a Monday; that week ends in December.
    const across = buildRange(2026, 10, 30, "week");
    expect(across.headerGroups).toHaveLength(2);
    expect(across.headerGroups.reduce((n, g) => n + g.days, 0)).toBe(
      DAYS_IN_WEEK,
    );
    expect(across.headerGroups[0].days).toBe(1);
    // Two months named, neither of them saying a year until it leads.
    expect(across.headerGroups[0].label).not.toBe(across.headerGroups[1].label);
    expect(across.headerGroups[0].label).not.toMatch(/2026/);
    expect(across.headerGroups[0].full).toMatch(/2026/);
  });

  it("names a weekday by its initial and its date", () => {
    // Said without a language: a narrow weekday is a letter in en and in
    // fr alike, and what matters is the date beside it.
    const monday = range.days[0];
    const parts = columnParts(monday, "weekday");
    expect(parts.main).toBe("9");
    expect(parts.lead).toBe(
      monday.toLocaleDateString(undefined, { weekday: "narrow" }),
    );
    expect(parts.lead!.length).toBeLessThanOrEqual(2);
  });

  it("leaves a column with nothing to set back alone", () => {
    expect(columnParts(range.days[0], "hour").lead).toBeUndefined();
    expect(columnParts(range.days[0], "week").lead).toBeUndefined();
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

  it("puts a bar on the days it covers, inside the weeks", () => {
    // 12 Oct to 16 Oct is five days of a seven-day column. It used to be
    // drawn as the whole column, which is where a record dated the 29th
    // came out at the 26th.
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
    expect(geo?.width).toBe((5 * WEEK_WIDTH) / 7);
    expect(geo?.left).toBe(2 * WEEK_WIDTH); // 28 Sep, 5 Oct, 12 Oct — a Monday
  });

  it("starts a bar partway into its week", () => {
    // The record from the report: 29 October, a Thursday, in the week of
    // the 26th. Three days in, not at the column's edge.
    const geo = getGeo(
      {
        id: "deposit",
        title: "Deposit",
        start: new Date(2026, 9, 29),
        end: new Date(2026, 10, 12),
        allDay: true,
      },
      range,
      true,
    );
    const column = Math.floor(geo!.left / WEEK_WIDTH);
    expect(range.days[column].getDate()).toBe(26);
    expect(geo!.left - column * WEEK_WIDTH).toBeCloseTo(
      (3 * WEEK_WIDTH) / 7,
      0,
    );
    expect(geo!.width).toBeCloseTo((15 * WEEK_WIDTH) / 7, 0); // 29 Oct–12 Nov
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
// Twelve month-columns read as a year but said only which month a thing
// fell in: a bar of a few days had no width, and everything short in a
// month stacked on its 1st. A column is a week now — fifty-two of them,
// grouped by the month they start in.

describe("a year, by the week", () => {
  const range = buildRange(2026, 10, 15, "year");

  it("is the year's weeks", () => {
    expect(range.unit).toBe("week");
    expect(range.cellWidth).toBe(YEAR_WEEK_WIDTH);
    // 52 or 53, depending on where the year's days fall across its weeks.
    expect(range.days.length).toBeGreaterThanOrEqual(52);
    expect(range.days.length).toBeLessThanOrEqual(53);
  });

  it("starts every column on a Monday", () => {
    expect(range.days.every((d) => d.getDay() === 1)).toBe(true);
  });

  it("owns the weeks whose midweek falls in it", () => {
    // How a week that straddles new year is settled: by where most of it
    // lies. Every column's Thursday is inside the year, so no column is
    // drawn under a month of the year before or after.
    const midweek = (d: Date) => {
      const thursday = new Date(d);
      thursday.setDate(d.getDate() + 3);
      return thursday;
    };
    expect(
      firstBreak(
        range.days,
        (d) => midweek(d).getFullYear() === 2026,
        (d) => ({ column: d.toString(), midweek: midweek(d).toString() }),
      ),
    ).toBeNull();
  });

  it.each([2021, 2024, 2025, 2026, 2027])(
    "has twelve months and no stray thirteenth in %i",
    (y) => {
      // A year taken by its Mondays gave 2024 a second "January" at the
      // end, from the week of the 30th of December whose Thursday is in
      // the next year — under a heading that reads as this one's.
      const r = buildRange(y, 5, 15, "year");
      expect(r.headerGroups).toHaveLength(12);
      expect(r.headerGroups.reduce((n, g) => n + g.days, 0)).toBe(
        r.days.length,
      );
      expect(r.days.length).toBeGreaterThanOrEqual(52);
      expect(r.days.length).toBeLessThanOrEqual(53);
    },
  );

  it("covers the whole year without a gap or a repeat", () => {
    // One week on, by the calendar. Not by a count of milliseconds: where
    // the clocks go forward a week is 167 hours long and where they go
    // back it is 169, and a column is a week either way.
    expect(
      firstBreak(
        range.days,
        (d, i) =>
          i === 0 ||
          d.getTime() === shiftDate(range.days[i - 1], "week", 1).getTime(),
        (d, i) => ({
          column: d.toString(),
          week_after: shiftDate(range.days[i - 1], "week", 1).toString(),
        }),
      ),
    ).toBeNull();
    expect(range.endDate.getTime()).toBeGreaterThanOrEqual(
      new Date(2026, 11, 31).getTime(),
    );
  });

  it("groups the weeks by the month each one starts in", () => {
    expect(range.headerGroups).toHaveLength(12);
    expect(range.headerGroups.reduce((n, g) => n + g.days, 0)).toBe(
      range.days.length,
    );
    // Every group has weeks in it; none is an empty heading.
    expect(range.headerGroups.every((g) => g.days > 0)).toBe(true);
  });

  it("knows each month's year without saying it twice over", () => {
    expect(range.labelsCarryYear).toBe(true);
    expect(range.headerGroups.every((g) => !/2026/.test(g.label))).toBe(true);
    expect(range.headerGroups.every((g) => /2026/.test(g.full))).toBe(true);
  });

  it("names a column by its day alone where a month sits above it", () => {
    // Fifty-two columns have no room for the month, and the group above
    // each run of them has already said it.
    expect(columnLabel(new Date(2026, 10, 16), "week", false)).toBe("16");
    // It can still name the month where something asks for it; nothing
    // does now, a quarter's weeks having months over them too.
    expect(columnLabel(new Date(2026, 10, 16), "week", true)).not.toBe("16");
  });

  it("puts a bar on the days it runs through", () => {
    const start = range.days[8];
    const end = new Date(range.days[11]);
    end.setDate(end.getDate() + 2);
    const geo = getGeo(
      { id: "r", title: "r", start, end, allDay: true },
      range,
      true,
    );
    // A Monday to the Wednesday three weeks on: 24 days, where a day is a
    // seventh of a column.
    expect(geo?.left).toBe(8 * YEAR_WEEK_WIDTH);
    expect(geo?.width).toBeCloseTo((24 * YEAR_WEEK_WIDTH) / 7, 0);
  });

  it("gives a record inside one week its own day of that week", () => {
    const start = new Date(range.days[20]);
    start.setDate(start.getDate() + 1); // the Tuesday
    const geo = getGeo(
      { id: "r", title: "r", start, end: start, allDay: true },
      range,
      true,
    );
    expect(geo?.left).toBeCloseTo(
      20 * YEAR_WEEK_WIDTH + YEAR_WEEK_WIDTH / 7,
      0,
    );
    // Six pixels of a 44px week is below the floor every bar gets.
    expect(geo?.width).toBe(MIN_BAR_WIDTH);
  });

  it("is the same year from any date inside it", () => {
    expect(buildRange(2026, 0, 1, "year").days[0].getTime()).toBe(
      range.days[0].getTime(),
    );
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
    expect(parts(stepRange(at(2026, 10, 15), "day", 1))).toEqual([
      2026, 10, 16,
    ]);
    expect(parts(stepRange(at(2026, 10, 1), "day", -1))).toEqual([2026, 9, 31]);
  });

  it("moves a week", () => {
    expect(parts(stepRange(at(2026, 10, 9), "week", 1))).toEqual([
      2026, 10, 16,
    ]);
    expect(parts(stepRange(at(2026, 10, 2), "week", -1))).toEqual([
      2026, 9, 26,
    ]);
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

// ── Dragging a card ────────────────────────────────────────────────────────
// Sideways it moves the record's dates by whole columns; up and down it
// moves the record's row. Both are the same arithmetic the grid is drawn
// with, so a card lands where it was dropped.

describe("moving a card by columns", () => {
  const at = (y: number, m: number, d: number, h = 0) => new Date(y, m, d, h);

  it("moves an hour in a day", () => {
    const moved = shiftDate(at(2026, 10, 15, 9), "hour", 3);
    expect(moved.getHours()).toBe(12);
    expect(moved.getDate()).toBe(15);
  });

  it("carries an hourly move over midnight", () => {
    const moved = shiftDate(at(2026, 10, 15, 23), "hour", 2);
    expect(moved.getDate()).toBe(16);
    expect(moved.getHours()).toBe(1);
  });

  it("moves a day in a month or a week", () => {
    expect(shiftDate(at(2026, 10, 15), "day", 4).getDate()).toBe(19);
    expect(shiftDate(at(2026, 10, 15), "weekday", -2).getDate()).toBe(13);
  });

  it("moves a whole week in a quarter", () => {
    const moved = shiftDate(at(2026, 10, 9), "week", 2);
    expect(moved.getDate()).toBe(23);
    expect(moved.getDay()).toBe(1);
  });

  it("moves a month in a year, keeping the day of the month", () => {
    // Not 30 days: a card dragged one column lands in the next month.
    const moved = shiftDate(at(2026, 0, 15), "month", 2);
    expect(moved.getMonth()).toBe(2);
    expect(moved.getDate()).toBe(15);
  });

  it("carries a move over the end of a year", () => {
    expect(shiftDate(at(2026, 11, 15), "month", 1).getFullYear()).toBe(2027);
    expect(shiftDate(at(2026, 0, 1), "day", -1).getFullYear()).toBe(2025);
  });

  it("leaves a date alone when nothing moved", () => {
    const d = at(2026, 10, 15, 9);
    expect(shiftDate(d, "hour", 0).getTime()).toBe(d.getTime());
  });

  it("agrees with the grid about what a column is", () => {
    // The card knows its view, the grid knows its range: if these two ever
    // disagreed, a card would land where nothing was drawn.
    for (const tf of ["day", "week", "month", "quarter", "year"] as const) {
      expect(unitFor(tf)).toBe(buildRange(2026, 10, 15, tf).unit);
      expect(cellWidthFor(tf)).toBe(buildRange(2026, 10, 15, tf).cellWidth);
    }
  });
});

describe("dropping a card on another row", () => {
  const ids = ["a", "b", "c", "d"];

  it("puts a row in front of the one it lands on, moving up", () => {
    expect(dropBeforeId(ids, 2, 0)).toBe("a");
    expect(dropBeforeId(ids, 3, 1)).toBe("b");
  });

  it("counts past itself, moving down", () => {
    // The row is still in the list above the gap it is moving into, so the
    // target is the one after. Without this a row dragged down by one lands
    // back where it started.
    expect(dropBeforeId(ids, 0, 1)).toBe("c");
    expect(dropBeforeId(ids, 1, 2)).toBe("d");
  });

  it("goes to the end when it lands last", () => {
    expect(dropBeforeId(ids, 0, 3)).toBeNull();
  });

  it("stays inside the list", () => {
    expect(dropBeforeId(ids, 2, -5)).toBe("a");
    expect(dropBeforeId(ids, 3, 99)).toBeNull();
    // Already first and dragged higher: it lands on itself, which is no
    // move at all rather than a move to the front.
    expect(dropBeforeId(ids, 0, -5)).toBeNull();
  });

  it("does nothing when a row lands on itself", () => {
    expect(dropBeforeId(ids, 2, 2)).toBeNull();
  });
});

describe("turning a scroll position into a moment, and back", () => {
  // The scrollbar steps the range the way the arrows do, then puts the
  // view back on the moment it was reading. That only works if these two
  // are exact inverses — a drift of a few px per step would walk the view
  // away from where the person left it.
  const at = (tf: Timeframe, y = 2026, m = 10, d = 15) =>
    buildRange(y, m, d, tf);

  it.each<Timeframe>(["day", "week", "month", "quarter", "year"])(
    "round-trips an offset in %s",
    (tf) => {
      const range = at(tf);
      for (const px of [0, 37, 160, 999]) {
        expect(offsetOfTime(range, timeAtOffset(range, px))).toBeCloseTo(px, 6);
      }
    },
  );

  it("reads the start of a column as that column's own moment", () => {
    const range = at("day");
    expect(timeAtOffset(range, 3 * range.cellWidth)).toBe(
      range.days[3].getTime(),
    );
    expect(offsetOfTime(range, range.days[3].getTime())).toBe(
      3 * range.cellWidth,
    );
  });

  it("holds across a step, which is the whole point", () => {
    // What the carry does: read the moment, rebuild the range a day on,
    // ask where that moment went. It must still be the same moment.
    const before = buildRange(2026, 10, 15, "day");
    const after = buildRange(2026, 10, 16, "day");
    const moment = timeAtOffset(before, 30 * before.cellWidth);
    const px = offsetOfTime(after, moment);
    expect(timeAtOffset(after, px)).toBe(moment);
    // A day on, the same moment sits 24 columns further left.
    expect(px).toBeCloseTo((30 - HOURS_IN_DAY) * before.cellWidth, 6);
  });

  it("places a moment outside the range outside it, rather than clamping", () => {
    // The caller clamps; clamping here would report the edge as a hit.
    const range = at("day");
    expect(
      offsetOfTime(range, range.days[0].getTime() - 3600_000),
    ).toBeLessThan(0);
  });

  it("measures a month's columns by the month, not by a fixed length", () => {
    // A Month's columns are days of unequal months; a column is as long
    // as the gap to the next one, whatever the unit happens to be.
    const range = buildRange(2026, 1, 15, "month");
    const mid = offsetOfTime(range, new Date(2026, 1, 15).getTime());
    expect(mid / range.cellWidth).toBeCloseTo(14, 6);
  });
});

// ── Scrolling past the range on show ──────────────────────────────────────
// A range is built with pages of context either side of the page it is
// anchored to, and that is the whole of how the timeline scrolls past the
// date, the week, the month on show: the scroller is handed columns to move
// across, so the browser scrolls its own content and nothing has to write a
// position under the gesture. Stepping the range at an end and putting the
// scroll back is what used to snap.

describe("a range with its context either side", () => {
  const TIMEFRAMES: Timeframe[] = ["day", "week", "month", "quarter", "year"];

  it("gives every timeframe some", () => {
    for (const tf of TIMEFRAMES) expect(padFor(tf)).toBeGreaterThan(0);
  });

  it("is the page alone when none is asked for", () => {
    // Which is what the pure arithmetic — and every test above — reads.
    for (const tf of TIMEFRAMES) {
      const page = buildRange(2026, 10, 15, tf);
      expect(page.anchorIndex).toBe(0);
      expect(buildRange(2026, 10, 15, tf, 0).days).toHaveLength(
        page.days.length,
      );
    }
  });

  it.each(TIMEFRAMES)(
    "holds %s's own page, unchanged, at anchorIndex",
    (tf) => {
      const page = buildRange(2026, 10, 15, tf);
      const pad = padFor(tf);
      const range = buildRange(2026, 10, 15, tf, pad);

      // The page is in there as it was: the same columns, at anchorIndex.
      expect(range.anchorIndex).toBe(page.days.length * pad);
      expect(range.days).toHaveLength(page.days.length * (2 * pad + 1));
      page.days.forEach((d, i) => {
        expect(range.days[range.anchorIndex + i].getTime()).toBe(d.getTime());
      });
      expect(range.unit).toBe(page.unit);
      expect(range.cellWidth).toBe(page.cellWidth);
      expect(range.timeframe).toBe(tf);
    },
  );

  it.each(TIMEFRAMES)("runs one way, evenly, in %s", (tf) => {
    const range = buildRange(2026, 10, 15, tf, padFor(tf));
    // Strictly increasing, and one column of its own unit apart all the way
    // across: the context is made of the same thing the page is, and there
    // is no seam where the two were joined.
    //
    // By the calendar, not by a count of milliseconds. Where the clocks
    // change a day is 23 hours or 25 and a week 167 or 169, and a column is
    // a day or a week regardless — which is why every step in this file
    // goes through Date's own setters.
    //
    // Counted from the first column, not from the one before it. Where the
    // clocks go forward at midnight (Santiago, Asunción) that day has no
    // midnight, so stepping one at a time lands on 01:00 and carries that
    // hour for the rest of the range; the grid is built from a fixed base
    // and keeps every column on its own date's midnight, which is right.
    const first = range.days[0];
    expect(
      firstBreak(
        range.days,
        (d, i) => i === 0 || d.getTime() > range.days[i - 1].getTime(),
        (d, i) => ({
          column: d.toString(),
          after: range.days[i - 1]?.toString(),
        }),
      ),
    ).toBeNull();
    expect(
      firstBreak(
        range.days,
        (d, i) => d.getTime() === shiftDate(first, range.unit, i).getTime(),
        (d, i) => ({
          column: d.toString(),
          calendar: shiftDate(first, range.unit, i).toString(),
        }),
      ),
    ).toBeNull();
    expect(range.startDate.getTime()).toBe(range.days[0].getTime());
    expect(range.endDate.getTime()).toBeGreaterThan(
      range.days[range.days.length - 1].getTime(),
    );
  });

  it.each(TIMEFRAMES)("heads every column of %s with something", (tf) => {
    const range = buildRange(2026, 10, 15, tf, padFor(tf));
    const covered = range.headerGroups.reduce((n, g) => n + g.days, 0);
    expect(covered).toBe(range.days.length);
    expect(range.headerGroups.length).toBeGreaterThan(1);
    expect(range.labelsCarryYear).toBe(true);
  });

  it("knows which year each heading belongs to", () => {
    // The bug this replaces: the year was written over the first heading
    // of the range and no other, and the header draws the headings that
    // are on screen — which, in twenty years of them, is never the first.
    // A heading read "novembre", in a range holding twenty Novembers. Each
    // carries its own year now, for the view to show on the lead.
    const range = buildRange(2026, 10, 15, "month", padFor("month"));
    const years = new Set(
      range.headerGroups.map((g) => g.full.match(/\d{4}/)?.[0]),
    );
    expect(years.size).toBeGreaterThan(5);
    expect([...years].every(Boolean)).toBe(true);
  });

  it("names a date per date in Day and a month per month elsewhere", () => {
    const day = buildRange(2026, 10, 15, "day", 1);
    // 144 hours from noon on the 12th: seven dates, the first and the last
    // of them half-drawn — a group per date, none longer than a day.
    const dates = new Set(day.days.map((d) => d.getDate()));
    expect(day.headerGroups).toHaveLength(dates.size);
    expect(day.headerGroups).toHaveLength(7);
    expect(day.headerGroups.every((g) => g.days <= HOURS_IN_DAY)).toBe(true);
    expect(day.headerGroups[0].days).toBe(HOURS_IN_DAY - DAY_LEAD_HOURS);

    // By the week's midweek, not by the Monday it starts on: the week of
    // the 23rd of November is November's, and the week of the 30th is
    // December's — its Thursday is the 3rd.
    const weeks = [new Date(2026, 10, 23), new Date(2026, 10, 30)];
    expect(weeks.every((d) => d.getDay() === 1)).toBe(true);
    expect(headerGroupsFor(weeks, "week")).toHaveLength(2);
    // Taken by their Mondays both would read as November.
    expect(headerGroupsFor(weeks, "weekday")).toHaveLength(1);
  });

  it("opens Day on its date, not on the afternoon before it", () => {
    // What the view scrolls to: the page's start plus the hours Day puts
    // in front of the date it centres.
    const range = buildRange(2026, 10, 15, "day", padFor("day"));
    const opensAt = range.anchorIndex + DAY_LEAD_HOURS;
    expect(range.days[opensAt].getDate()).toBe(15);
    expect(range.days[opensAt].getHours()).toBe(0);
  });

  it.each(TIMEFRAMES)("round-trips an offset across %s", (tf) => {
    // The re-anchor at the far edge reads a moment off the scroll position
    // and writes it back as one. A drift of a few px either way would be
    // visible as exactly the jump this is meant to avoid.
    const range = buildRange(2026, 10, 15, tf, padFor(tf));
    const width = range.days.length * range.cellWidth;
    for (const px of [0, 17, width / 3, width / 2, width - 1]) {
      expect(offsetOfTime(range, timeAtOffset(range, px))).toBeCloseTo(px, 6);
    }
  });

  it.each(TIMEFRAMES)("re-anchors %s without moving what is on show", (tf) => {
    // The far edge, where the scroll has run out of context: the range is
    // rebuilt around the moment being read. That moment must come back at
    // a position with room on both sides of it — a page at least — or the
    // scroll would arrive at an end again and bounce, which is the bug
    // this whole arrangement replaces.
    const pad = padFor(tf);
    const range = buildRange(2026, 10, 15, tf, pad);
    const edge = range.days.length * range.cellWidth - 1;
    const moment = timeAtOffset(range, edge);

    const on = new Date(moment);
    const next = buildRange(
      on.getFullYear(),
      on.getMonth(),
      on.getDate(),
      tf,
      pad,
    );
    const px = offsetOfTime(next, moment);
    // The same moment, and still exactly it.
    expect(timeAtOffset(next, px)).toBeCloseTo(moment, -1);

    const page = buildRange(2026, 10, 15, tf).days.length * range.cellWidth;
    const width = next.days.length * next.cellWidth;
    expect(px).toBeGreaterThan(page);
    expect(width - px).toBeGreaterThan(page);
  });

  it("places a record that falls outside the page but inside the context", () => {
    // The payoff, in one assertion: scroll on into next month and the bars
    // of next month are drawn, where a range of one page had nothing to
    // show and the record was an arrow at the edge.
    const rec: TimelineRecord = {
      id: "r",
      title: "r",
      start: new Date(2026, 11, 20),
      end: new Date(2026, 11, 23),
      allDay: true,
    };
    const page = buildRange(2026, 10, 15, "month");
    expect(getGeo(rec, page, true)).toBeNull();

    const range = buildRange(2026, 10, 15, "month", padFor("month"));
    const geo = getGeo(rec, range, true);
    expect(geo).not.toBeNull();
    expect(geo!.width).toBe(4 * DAY_WIDTH);
    // On the 20th of December 2026, wherever that column happens to be —
    // the range runs over years, so the year is part of saying which.
    expect(geo!.left / DAY_WIDTH).toBe(
      range.days.findIndex(
        (d) =>
          d.getFullYear() === 2026 && d.getMonth() === 11 && d.getDate() === 20,
      ),
    );
  });
});

// ── A range with no end to reach ───────────────────────────────────────────
// Every version of the scroll before this one let the range run out and then
// tried to hide it, and each had to write a scroll position to do it — which
// mid-gesture is either overridden or lands as a jump. So the range is built
// wide enough that no sitting at a wheel reaches an end of it, and only the
// columns on screen are drawn.

describe("a range nobody scrolls to the end of", () => {
  const TIMEFRAMES: Timeframe[] = ["day", "week", "month", "quarter", "year"];
  const DAY = 86_400_000;

  /** How long a padded range runs, in days. */
  const span = (tf: Timeframe) => {
    const r = buildRange(2026, 10, 15, tf, padFor(tf));
    return (r.endDate.getTime() - r.startDate.getTime()) / DAY;
  };

  it("runs a year either side in Day and ten in Week", () => {
    // What a wheel would have to cross to find an end. Stated as days so
    // that shrinking any of these trips the test rather than the person.
    expect(span("day")).toBeGreaterThan(600);
    expect(span("week")).toBeGreaterThan(3600);
    expect(span("month")).toBeGreaterThan(7000);
    expect(span("quarter")).toBeGreaterThan(35_000);
    expect(span("year")).toBeGreaterThan(40_000);
  });

  it.each(TIMEFRAMES)("still opens on the page asked for in %s", (tf) => {
    // Wide is no use if it loses the date it was asked about.
    const page = buildRange(2026, 10, 15, tf);
    const range = buildRange(2026, 10, 15, tf, padFor(tf));
    page.days.forEach((d, i) => {
      expect(range.days[range.anchorIndex + i].getTime()).toBe(d.getTime());
    });
  });
});

describe("drawing only the columns on screen", () => {
  const range = buildRange(2026, 10, 15, "month", padFor("month"));
  const cell = range.cellWidth;

  it("covers what the viewport shows", () => {
    const at = 4000;
    const { from, to } = columnWindow(range, at, 900);
    expect(from * cell).toBeLessThanOrEqual(at);
    expect(to * cell).toBeGreaterThanOrEqual(at + 900);
  });

  it("draws a screenful and not a range", () => {
    const { from, to } = columnWindow(range, 4000, 900);
    expect(to - from).toBeLessThan(WINDOW_BLOCK * 5);
    expect(range.days.length).toBeGreaterThan(5000);
  });

  it("asks for the same window again when the scroll barely moves", () => {
    // Which is what keeps the header and the grid still while scrolling:
    // the window is the prop they are memoised on.
    const a = columnWindow(range, 4000, 900);
    const b = columnWindow(range, 4000 + cell, 900);
    expect(b).toEqual(a);
  });

  it("moves the window on, a block at a time", () => {
    const a = columnWindow(range, 4000, 900);
    const b = columnWindow(range, 4000 + WINDOW_BLOCK * cell, 900);
    expect(b.from).toBe(a.from + WINDOW_BLOCK);
    expect(b.to).toBe(a.to + WINDOW_BLOCK);
  });

  it("keeps inside the range at either end", () => {
    expect(columnWindow(range, 0, 900).from).toBe(0);
    const end = range.days.length * cell;
    expect(columnWindow(range, end - 900, 900).to).toBe(range.days.length);
  });

  it("draws something before the viewport has been measured", () => {
    // The first paint happens before the ResizeObserver reports, and a grid
    // that draws nothing then is a grid that flashes empty.
    const { from, to } = columnWindow(range, 0, 0);
    expect(to).toBeGreaterThan(from);
    expect(to - from).toBeGreaterThan(WINDOW_BLOCK);
  });
});

describe("finding a record's columns in a range of thousands", () => {
  // getGeo used to scan the columns for the one a moment falls in. At a few
  // dozen columns that was free; at a few thousand, twice per record, every
  // time a record changes, it is not — so it is a search now. A search that
  // disagreed with the scan would move every bar, so: it must not.
  const TIMEFRAMES: Timeframe[] = ["day", "week", "month", "quarter", "year"];

  /** The scan, as getGeo did it, for comparison. */
  const scanned = (range: ReturnType<typeof buildRange>, t: number) => {
    const inCell =
      range.unit === "hour"
        ? sameHour
        : range.unit === "week"
          ? sameWeek
          : range.unit === "month"
            ? sameMonth
            : sameDay;
    return range.days.findIndex((d) => inCell(d, new Date(t)));
  };

  it.each(TIMEFRAMES)("agrees with the scan it replaced in %s", (tf) => {
    const range = buildRange(2026, 10, 15, tf, padFor(tf));
    const w = range.cellWidth;
    // Dates spread across the whole of it, and the ends of it exactly.
    const picks = [0, 1, 7, 99, 500, 1234, range.days.length - 1].filter(
      (i) => i < range.days.length,
    );
    for (const i of picks) {
      const at = range.days[i];
      const geo = getGeo(
        { id: "r", title: "r", start: at, end: at, allDay: false },
        range,
        false,
      );
      expect(geo).not.toBeNull();
      // The same column the scan would have found.
      expect(scanned(range, at.getTime())).toBe(i);
      // Each pick is a column's own first moment, so the bar starts on its
      // edge. Its width is one grain of the grid — an hour in Day, a day
      // everywhere else — with the floor that keeps a year's day visible.
      expect(geo!.left).toBe(i * w);
      expect(geo!.width).toBe(
        Math.max(MIN_BAR_WIDTH, grainWidth(range.unit, w)),
      );
    }
  });

  it("spans a whole day in Day, not its first hour", () => {
    // The end of an all-day record used to be found by scanning backwards
    // for the last column of its date; the search asks for the column
    // holding the last moment of that date instead, which is the same one.
    const range = buildRange(2026, 10, 15, "day", padFor("day"));
    const geo = getGeo(
      {
        id: "r",
        title: "r",
        start: new Date(2026, 10, 15),
        end: new Date(2026, 10, 15),
        allDay: true,
      },
      range,
      true,
    );
    expect(geo!.width).toBe(HOURS_IN_DAY * HOUR_WIDTH);
    expect(range.days[geo!.left / HOUR_WIDTH].getHours()).toBe(0);
    expect(range.days[geo!.left / HOUR_WIDTH].getDate()).toBe(15);
  });

  it("runs a bar over the days an all-day record covers", () => {
    const range = buildRange(2026, 10, 15, "month", padFor("month"));
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
    expect(geo!.width).toBe(3 * DAY_WIDTH);
  });
});

describe("an hour column where the clocks change", () => {
  // A Day range is a year of hours now, so it always holds both of the
  // year's transitions. Built from the wall clock, the hour that does not
  // exist in spring drew its neighbour twice and dropped an hour out of the
  // grid: two columns, one instant. A column is an hour of elapsed time.
  const range = buildRange(2026, 10, 15, "day", padFor("day"));

  it("never draws the same instant twice", () => {
    expect(
      firstBreak(
        range.days,
        (d, i) => i === 0 || d.getTime() > range.days[i - 1].getTime(),
        (d, i) => ({
          column: d.toString(),
          after: range.days[i - 1]?.toString(),
        }),
      ),
    ).toBeNull();
  });

  it("is an hour apart all the way across", () => {
    expect(
      firstBreak(
        range.days,
        (d, i) =>
          i === 0 || d.getTime() - range.days[i - 1].getTime() === 3_600_000,
        (d, i) => ({
          column: d.toString(),
          ms_after_the_one_before: d.getTime() - range.days[i - 1].getTime(),
        }),
      ),
    ).toBeNull();
  });

  it("moves a card by an hour of elapsed time", () => {
    // The grid is elapsed hours, so a card dragged one column is too, or a
    // drag across a transition would land a column off what it was dropped
    // on.
    const at = new Date(2026, 10, 15, 9);
    expect(shiftDate(at, "hour", 3).getTime() - at.getTime()).toBe(
      3 * 3_600_000,
    );
  });
});

describe("a quarter, measured off the reference", () => {
  // The reference shows Q2 2027: fourteen columns stepping 105px, the first
  // of them Monday 29 March, and four month lines — at x 142, 591, 1056 and
  // 1506 with the first column's edge at 96, so 46, 495, 960 and 1410 along.
  //
  // A line falls where its month truly starts, which is inside a week and
  // not at the Monday nearest it: the 1st of April 2027 is a Thursday, three
  // sevenths of the way through the week of the 29th. All four say so.
  const range = buildRange(2027, 3, 15, "quarter", padFor("quarter"));
  const from = range.anchorIndex * range.cellWidth;
  const at = (month: number) =>
    offsetOfTime(range, new Date(2027, month, 1).getTime()) - from;

  it("steps a week at a time, 105px apart", () => {
    expect(range.cellWidth).toBe(105);
    expect(range.unit).toBe("week");
  });

  it("starts the quarter on the Monday the reference starts on", () => {
    const first = range.days[range.anchorIndex];
    expect(first.getDay()).toBe(1);
    expect(first.toDateString()).toBe("Mon Mar 29 2027");
  });

  it("puts every month line where the reference has it", () => {
    // Half a pixel, not the millionth: where the clocks change inside a
    // week, a day of it is drawn about a quarter-pixel off (see below).
    expect(at(3)).toBeCloseTo(45, 0); // 1 April, a Thursday: 3/7 into its week
    expect(at(4)).toBeCloseTo(495, 0); // 1 May, a Saturday: 5/7 into its week
    expect(at(5)).toBeCloseTo(960, 0); // 1 June, a Tuesday: 1/7
    expect(at(6)).toBeCloseTo(1410, 0); // 1 July, a Thursday: 3/7
  });

  it("names a column by its date alone", () => {
    // The reference's columns read 29, 5, 12, 19 — the month is said once,
    // above them.
    expect(columnParts(range.days[range.anchorIndex], "week", false)).toEqual({
      main: "29",
    });
  });
});

// ── What a bar's handle writes ────────────────────────────────────────────
// Dragging the right edge out over N grains must leave a bar N grains wide.
// A grain is what the handle can measure: an hour in Day, a day everywhere
// else. It wrote days whatever the columns were, so in a quarter and a year
// — where a column is a week — a four-column drag came back less than one
// column long and the bar sprang back to where it started. Counting whole
// *columns* instead went the other way: the smallest possible drag of a
// handle there would have been a week.

describe("resizing a bar", () => {
  const TIMEFRAMES: Timeframe[] = ["day", "week", "month", "quarter", "year"];
  const started = new Date(2026, 10, 20, 9);

  it.each(TIMEFRAMES)("leaves a bar as wide as it was dragged in %s", (tf) => {
    const range = buildRange(2026, 10, 20, tf, padFor(tf));
    const unit = unitFor(tf);
    const grain = grainWidth(unit, cellWidthFor(tf));
    const start = parseDateValue(started.toISOString()).start!;

    for (const steps of [2, 4, 9, 23]) {
      // What the handle hands over, and what the view draws from it.
      const end = endForGrains(start, unit, steps);
      const geo = getGeo(
        { id: "r", title: "r", start, end, allDay: false },
        range,
        true,
      );
      expect(geo).not.toBeNull();
      expect(geo!.width).toBeCloseTo(steps * grain, 6);
    }
  });

  it("holds its ground on a drag too small to count", () => {
    // Half a grain back is still one: a bar cannot be no grains wide, and
    // the dates stay as they were.
    const start = new Date(2026, 10, 20, 9);
    for (const tf of TIMEFRAMES) {
      const unit = unitFor(tf);
      expect(endForGrains(start, unit, 0.4).getTime()).toBe(start.getTime());
      expect(endForGrains(start, unit, 1).getTime()).toBe(start.getTime());
    }
  });

  it("measures a quarter's drag in days, a seventh of a column at a time", () => {
    // A week column cannot be the step, or the smallest drag of a handle
    // would turn a one-day record into a seven-day one.
    expect(grainWidth(unitFor("quarter"), cellWidthFor("quarter"))).toBe(15);
    expect(grainWidth(unitFor("year"), cellWidthFor("year"))).toBe(44 / 7);
    expect(grainWidth(unitFor("month"), cellWidthFor("month"))).toBe(40);
    expect(grainWidth(unitFor("day"), cellWidthFor("day"))).toBe(64);

    const start = new Date(2026, 10, 20);
    expect(
      (endForGrains(start, unitFor("quarter"), 4).getTime() - start.getTime()) /
        86_400_000,
    ).toBe(3);
    expect(
      (endForGrains(start, unitFor("day"), 4).getTime() - start.getTime()) /
        3_600_000,
    ).toBe(3);
  });
});

// ── Where a bar is drawn ──────────────────────────────────────────────────
// A record dated the 29th was drawn at the 26th in a quarter and at the 19th
// in a year: a bar took its column's left edge, and a column there is a
// whole week, so every date in it began on its Monday. A bar is placed by
// its dates now, interpolated inside the column — the same arithmetic that
// puts the month lines where the reference has them.

// A position inside a column is read from elapsed time, so where the clocks
// go back inside one, a day of it is drawn about a quarter of a pixel off —
// a 169-hour week divided seven ways. Invisible, and the same arithmetic
// runs both ways (offsetOfTime and timeAtOffset stay inverses), so these
// are held to half a pixel rather than to the millionth.

describe("a bar's place in the grid", () => {
  /** The record from the report: Deposit, 29 October to 12 November 2026. */
  const deposit = {
    id: "deposit",
    title: "Deposit",
    start: new Date(2026, 9, 29),
    end: new Date(2026, 10, 12),
    allDay: true,
  };

  const geoIn = (tf: Timeframe) => {
    const range = buildRange(2026, 9, 29, tf, padFor(tf));
    const geo = getGeo(deposit, range, true);
    expect(geo).not.toBeNull();
    return { range, geo: geo! };
  };

  it.each(["quarter", "year"] as Timeframe[])(
    "starts it on its own date in %s, not on its week's Monday",
    (tf) => {
      const { range, geo } = geoIn(tf);
      const day = grainWidth(range.unit, range.cellWidth);

      // The Monday of the 29th's week is the 26th: three days earlier.
      const monday = range.days[Math.floor(geo.left / range.cellWidth)];
      expect(monday.getDate()).toBe(26);
      expect(geo.left - monday.getTime() * 0).toBeGreaterThan(0);
      expect(geo.left).toBeCloseTo(
        offsetOfTime(range, deposit.start.getTime()),
        6,
      );
      // Three days past the column's edge, to within half a pixel.
      expect(geo.left % range.cellWidth).toBeCloseTo(3 * day, 0);

      // 29 October through the end of 12 November: fifteen days.
      expect(geo.width).toBeCloseTo(15 * day, 0);
    },
  );

  it.each(["day", "week", "month"] as Timeframe[])(
    "still lands on the column edge in %s, where a column is no wider than a day",
    (tf) => {
      // The new arithmetic has to be the old arithmetic wherever a date is a
      // whole number of columns, or this fix would have moved every other
      // timeframe by a fraction of a cell.
      const { range, geo } = geoIn(tf);
      expect(geo.left % range.cellWidth).toBeCloseTo(0, 6);
      // Fifteen days — in Day, the hours they really hold: where the clocks
      // go back inside them that is 361 of them, and the grid has 361
      // columns there to match.
      const from = new Date(2026, 9, 29);
      const to = new Date(2026, 10, 13);
      const columns =
        tf === "day" ? (to.getTime() - from.getTime()) / 3_600_000 : 15;
      expect(geo.width).toBeCloseTo(columns * range.cellWidth, 2);
    },
  );

  it("draws a single day in a year wide enough to see", () => {
    // A day of a year is six pixels of a 44px week. A bar that thin is not
    // a bar, so there is a floor — and it only ever applies there.
    const range = buildRange(2026, 10, 20, "year", padFor("year"));
    const one = {
      id: "o",
      title: "o",
      start: new Date(2026, 10, 20),
      end: new Date(2026, 10, 20),
      allDay: true,
    };
    const geo = getGeo(one, range, true)!;
    expect(geo.width).toBe(MIN_BAR_WIDTH);
    expect(44 / 7).toBeLessThan(MIN_BAR_WIDTH);

    const quarter = buildRange(2026, 10, 20, "quarter", padFor("quarter"));
    expect(getGeo(one, quarter, true)!.width).toBeCloseTo(15, 6);
  });

  it("times a bar to the hour in Day, as it always did", () => {
    const range = buildRange(2026, 10, 20, "day", padFor("day"));
    const meeting = {
      id: "m",
      title: "m",
      start: new Date(2026, 10, 20, 9, 30),
      end: new Date(2026, 10, 20, 11, 15),
      allDay: false,
    };
    const geo = getGeo(meeting, range, true)!;
    // 09:00 through the end of 11:00 — the hours it touches, three of them.
    expect(geo.left % range.cellWidth).toBeCloseTo(0, 6);
    expect(geo.width).toBeCloseTo(3 * range.cellWidth, 2);
  });
});

// ── Where today's line is drawn ───────────────────────────────────────────
// The same bug, in the one place the user reaches for when lost. The line
// and the Today button both looked for a column that *was* today, and in a
// quarter or a year a column is a week: on six days in seven nothing
// matched, so the line vanished and the button had nowhere to scroll to.

describe("today's position", () => {
  /** What the view computes for the line, and scrolls the button to. */
  const todayLeft = (range: TimelineRange, now: number) =>
    now < range.startDate.getTime() || now > range.endDate.getTime()
      ? null
      : offsetOfTime(range, now);

  it.each(["day", "week", "month", "quarter", "year"] as Timeframe[])(
    "has one in %s, whatever day of the week today is",
    (tf) => {
      // Every day of one week, so a Monday is not what carries the test.
      // One range for all seven: a quarter's is a century of columns to
      // build, and the view's range does not change from one day to the
      // next inside the page it is already showing.
      const range = buildRange(2026, 10, 19, tf, padFor(tf));
      for (let d = 16; d <= 22; d++) {
        const now = new Date(2026, 10, d, 14, 30);
        const left = todayLeft(range, now.getTime());
        expect(left).not.toBeNull();
        expect(left!).toBeGreaterThan(0);
        expect(left!).toBeLessThan(range.days.length * range.cellWidth);
      }
    },
  );

  it("puts it inside the week it belongs to, in a quarter", () => {
    const now = new Date(2026, 10, 19, 12); // a Thursday
    const range = buildRange(2026, 10, 19, "quarter", padFor("quarter"));
    const left = todayLeft(range, now.getTime())!;
    const column = Math.floor(left / range.cellWidth);
    expect(range.days[column].getDay()).toBe(1); // its Monday
    expect(range.days[column].getDate()).toBe(16);
    // Thursday noon: 3.5 days into a seven-day column.
    expect(left % range.cellWidth).toBeCloseTo((3.5 * range.cellWidth) / 7, 6);

    // And the rule it replaced, for the record: looking for a column that
    // *is* today finds one only in the week whose Monday it is.
    expect(range.days.findIndex((d) => sameDay(d, now))).toBe(-1);
    expect(
      range.days.findIndex((d) => sameDay(d, new Date(2026, 10, 16))),
    ).toBe(Math.floor(left / range.cellWidth));
  });

  it("has none when today is outside the range on show", () => {
    // Which takes some doing: the canvas a quarter is drawn on runs for
    // over a century. The guard is still what keeps the line off a grid it
    // doesn't belong on.
    const range = buildRange(2026, 10, 19, "quarter", padFor("quarter"));
    expect(range.startDate.getFullYear()).toBeLessThan(1990);
    expect(todayLeft(range, new Date(1500, 0, 1).getTime())).toBeNull();
    expect(todayLeft(range, new Date(2600, 0, 1).getTime())).toBeNull();
  });
});

// ── A bar held where it was dropped ───────────────────────────────────────
// A drop writes dates, and the bar is placed from those dates — so between
// the two the bar sprang back to where it had been and jumped again when
// the write landed. It is held at what the drop asked for until the view
// places it somewhere new.

describe("holding a bar where it was dropped", () => {
  const live = { left: 400, width: 105, top: 68 };

  it("draws what the drop asked for, not what the dates still say", () => {
    const held = holdBar(live, { left: live.left + 2 * 105 });
    expect(held.left).toBe(610);
    expect(held.width).toBe(105); // untouched by a sideways move
    expect(held.top).toBe(68);
    // The dates have not come back yet: the bar stays where it was put.
    expect(barCaughtUp(held, live)).toBe(false);
  });

  it("lets go once the view has placed it again", () => {
    const held = holdBar(live, { left: 610 });
    expect(barCaughtUp(held, { ...live, left: 610 })).toBe(true);
  });

  it("lets go even when the write came back a little different", () => {
    // A date clipped to the range, a reorder that settled elsewhere: once
    // the truth is in, the truth is what to draw.
    const held = holdBar(live, { left: 610 });
    expect(barCaughtUp(held, { ...live, left: 505 })).toBe(true);
    expect(barCaughtUp(held, { ...live, top: 102 })).toBe(true);
    expect(barCaughtUp(held, { ...live, width: 210 })).toBe(true);
  });

  it("holds a resized bar by its width", () => {
    const held = holdBar(live, { width: 4 * 105 });
    expect(held.width).toBe(420);
    expect(held.left).toBe(400);
    expect(barCaughtUp(held, live)).toBe(false);
    expect(barCaughtUp(held, { ...live, width: 420 })).toBe(true);
  });

  it("is not fooled by half a pixel", () => {
    // A position inside a column is read from elapsed time, so the same
    // place can come back a fraction out (the clocks going back inside a
    // week). That is not the view placing the bar again.
    const held = holdBar(live, { left: 610 });
    expect(barCaughtUp(held, { ...live, left: 400.27 })).toBe(false);
    expect(barCaughtUp(held, { ...live, left: 401 })).toBe(true);
  });

  it("holds a row move by the top it was dropped on", () => {
    const held = holdBar(live, { top: 68 + 34 });
    expect(held.top).toBe(102);
    expect(barCaughtUp(held, live)).toBe(false);
    expect(barCaughtUp(held, { ...live, top: 102 })).toBe(true);
  });
});
