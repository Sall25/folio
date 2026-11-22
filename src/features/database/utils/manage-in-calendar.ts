import type {
  CalendarView,
  DatabaseProperty,
  DatabaseView,
  ID,
  Page,
  TimelineView,
} from "src/types";

// Managing a timeline's records in a calendar.
//
// Notion sends the database to Notion Calendar, a separate app. Folio has
// no second app and does not need one: it has a calendar of its own, so the
// button is a round trip — the same records, the same dates, on a month
// grid, and a way back to the timeline you came from.
//
// This file is the part that can be decided without a screen: which
// calendar to open, and which records a calendar cannot show.

/**
 * The calendar view to manage these records in, if the database already has
 * one.
 *
 * The one reading the timeline's own date property first: a database can
 * hold several calendars, and the one that means the same thing as this
 * timeline is the one standing on the same dates. Otherwise the first
 * calendar there is — it is the person's own view, and taking them to it is
 * better than making a second one beside it.
 */
export function calendarViewFor(
  views: DatabaseView[],
  timeline: TimelineView | undefined,
): CalendarView | null {
  const calendars = views.filter(
    (v): v is CalendarView => v.type === "calendar",
  );
  if (calendars.length === 0) return null;
  const onSameDates = timeline
    ? calendars.find((c) => c.datePropertyId === timeline.startDatePropertyId)
    : undefined;
  return onSameDates ?? calendars[0];
}

/**
 * The date property a calendar made for this timeline should stand on: the
 * timeline's own, if it is a date property this database still has.
 */
export function dateForCalendar(
  properties: DatabaseProperty[],
  timeline: TimelineView | undefined,
): ID | null {
  const dates = properties.filter((p) => p.config.type === "date");
  if (dates.length === 0) return null;
  const same = dates.find((p) => p.id === timeline?.startDatePropertyId);
  return (same ?? dates[0]).id;
}

/**
 * The records a calendar has nowhere to put: no date, so no day to sit on.
 *
 * A timeline hides them just as completely, which is what makes the list
 * worth having — it is the one place they can be given a date by hand,
 * short of hunting them down in a table.
 */
export function unscheduledRecords(
  records: Page[],
  datePropertyId: ID | null | undefined,
): Page[] {
  if (!datePropertyId) return [];
  return records.filter((r) => !hasDate(r.values?.[datePropertyId]));
}

/** Whether a stored date value says anything. Both shapes in use: a plain
 *  string, and { start, end }. */
function hasDate(raw: unknown): boolean {
  if (typeof raw === "string") return raw.trim().length > 0;
  if (raw && typeof raw === "object") {
    const o = raw as { start?: unknown };
    return typeof o.start === "string" && o.start.trim().length > 0;
  }
  return false;
}
