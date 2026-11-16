import { describe, expect, it } from "vitest";
import {
  type Timeframe,
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
  startOfWeek,
  stepRange,
  shiftDate,
  dropBeforeId,
  unitFor,
  HOUR_WIDTH,
  buildRange,
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

  it("says the year over the first date and no other", () => {
    // The header appends no year of its own for hours, so a second "2026"
    // here would be the one that made a month read "Novembre 2026 2026".
    expect(range.headerGroups[0].label).toMatch(/2026/);
    expect(range.headerGroups[1].label).not.toMatch(/2026/);
    expect(range.headerGroups[2].label).not.toMatch(/2026/);
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
    // A time, never a date: 15 November must not read as "15".
    expect(at(15)).not.toBe("15");
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

  it("names the month above the week, saying the year once", () => {
    // The dates are under every column already, so the heading names the
    // month rather than repeating the span the columns spell out.
    expect(range.labelsCarryYear).toBe(true);
    expect(range.headerGroups).toHaveLength(1);
    expect(range.headerGroups[0].days).toBe(DAYS_IN_WEEK);
    expect(range.headerGroups[0].label).toMatch(/2026/);
  });

  it("names both months when the week runs across two", () => {
    // 30 November 2026 is a Monday; that week ends in December.
    const across = buildRange(2026, 10, 30, "week");
    expect(across.headerGroups).toHaveLength(2);
    expect(across.headerGroups.reduce((n, g) => n + g.days, 0)).toBe(
      DAYS_IN_WEEK,
    );
    expect(across.headerGroups[0].days).toBe(1);
    // Only the first says the year.
    expect(across.headerGroups[0].label).toMatch(/2026/);
    expect(across.headerGroups[1].label).not.toMatch(/2026/);
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
    for (const d of range.days) {
      const thursday = new Date(d);
      thursday.setDate(d.getDate() + 3);
      expect(thursday.getFullYear()).toBe(2026);
    }
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
    const WEEK = DAYS_IN_WEEK * 24 * 3600_000;
    for (let i = 1; i < range.days.length; i++) {
      expect(range.days[i].getTime() - range.days[i - 1].getTime()).toBe(WEEK);
    }
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

  it("says the year over the first month and no other", () => {
    expect(range.labelsCarryYear).toBe(true);
    expect(range.headerGroups[0].label).toMatch(/2026/);
    expect(
      range.headerGroups.slice(1).every((g) => !/2026/.test(g.label)),
    ).toBe(true);
  });

  it("names a column by its day alone where a month sits above it", () => {
    // Fifty-two columns have no room for the month, and the group above
    // each run of them has already said it.
    expect(columnLabel(new Date(2026, 10, 16), "week", false)).toBe("16");
    // A quarter has no month groups, so its weeks still carry theirs.
    expect(columnLabel(new Date(2026, 10, 16), "week", true)).not.toBe("16");
  });

  it("puts a bar on the weeks it runs through", () => {
    const start = range.days[8];
    const end = new Date(range.days[11]);
    end.setDate(end.getDate() + 2);
    const geo = getGeo(
      { id: "r", title: "r", start, end, allDay: true },
      range,
      true,
    );
    expect(geo?.left).toBe(8 * YEAR_WEEK_WIDTH);
    expect(geo?.width).toBe(4 * YEAR_WEEK_WIDTH);
  });

  it("gives a record inside one week that week's column, whole", () => {
    const start = new Date(range.days[20]);
    start.setDate(start.getDate() + 1);
    const geo = getGeo(
      { id: "r", title: "r", start, end: start, allDay: true },
      range,
      true,
    );
    expect(geo?.left).toBe(20 * YEAR_WEEK_WIDTH);
    expect(geo?.width).toBe(YEAR_WEEK_WIDTH);
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
