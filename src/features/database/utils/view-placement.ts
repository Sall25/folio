import type { DatabaseProperty, DatabaseView, ID } from "src/types";

// What a new record needs so the view it was made from can place it.
//
// A table, a list and a gallery show every record wherever its values
// fall, so a new one is always on screen there and there is nothing to
// seed. A timeline and a calendar place a record by a date: with none, a
// page made from one is nowhere to be seen, which reads as the button
// having failed. They start it on today.
//
// A board places records too, but by the column the person clicked — not
// something that can be worked out from the view alone — so it writes its
// own value after creating (use-record-creation: onNewRecordInGroup).
//
// Kept apart from the hooks so it can be tested without React, and so a
// view added later has one place to say where its records live.

/**
 * The local date as YYYY-MM-DD.
 *
 * Not toISOString, which is UTC: west of Greenwich that is yesterday for
 * much of the day, and a record created in the evening would open on the
 * wrong date — the same mistake parseIsoDate had to be fixed for.
 */
export function isoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The date property a view arranges its records by, if it does. */
export function placementPropertyId(
  view: DatabaseView | undefined,
  properties: DatabaseProperty[],
): ID | null {
  const isDate = (id: ID | undefined | null) =>
    !!id && properties.some((p) => p.id === id && p.config.type === "date");

  if (view?.type === "timeline") {
    return isDate(view.startDatePropertyId) ? view.startDatePropertyId! : null;
  }

  if (view?.type === "calendar") {
    if (isDate(view.datePropertyId)) return view.datePropertyId!;
    // The same fallback the calendar itself draws by (use-calendar-layout),
    // or a record would be seeded into one property and placed by another.
    return properties.find((p) => p.config.type === "date")?.id ?? null;
  }

  return null;
}

/**
 * The values a record created from this view starts with, or null when the
 * view places records by nothing.
 *
 * The date carries no time: a page belongs to the day it was made on, not
 * to the minute, and a plain date is what makes a bar span its day rather
 * than stand on midnight (isAllDayValue).
 */
export function placementSeed(
  view: DatabaseView | undefined,
  properties: DatabaseProperty[],
  today: Date,
): Record<ID, { start: string }> | null {
  const propertyId = placementPropertyId(view, properties);
  if (!propertyId) return null;
  return { [propertyId]: { start: isoDay(today) } };
}
