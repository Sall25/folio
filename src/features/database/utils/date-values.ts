/**
 * Parse the date values used by database properties.
 *
 * Created/edited time properties are stored as epoch milliseconds, while
 * user-authored date values are normally ISO strings. Keeping the conversion
 * here prevents callers from accidentally turning an epoch number into an
 * invalid date by stringifying it first.
 */
export function toDate(value: unknown): Date | null {
  if (value == null || value === "") return null;

  if (typeof value === "object" && value !== null && "start" in value) {
    return toDate((value as { start: unknown }).start);
  }

  // "YYYY-MM-DD" is a calendar day: build it in local time, not UTC.
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (day) {
    return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
  }

  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : typeof value === "number"
        ? new Date(value)
        : new Date(String(value));

  return isNaN(date.getTime()) ? null : date;
}
