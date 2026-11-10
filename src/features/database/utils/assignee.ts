import type { DatabaseProperty, PersonValue } from "src/types";

// Assignees: the person property a database's "Assign to me", people bar
// and quick filter use, and the arithmetic of adding someone.

/** The database's assignee property: its first person property. */
export function assigneeProperty(
  properties: DatabaseProperty[],
): DatabaseProperty | null {
  return properties.find((p) => p.config.type === "person") ?? null;
}

/** The cell with `me` added (replacing the assignee when the property takes
 *  one person), or null when `me` is already in it. */
export function withAssignee(
  current: PersonValue[] | null | undefined,
  me: PersonValue,
  single: boolean,
): PersonValue[] | null {
  const list = current ?? [];
  if (list.some((p) => p.id === me.id)) return null;
  return single ? [me] : [...list, me];
}

/** Who's in `after` and wasn't in `before`. */
export function addedPeople(
  before: PersonValue[] | null | undefined,
  after: PersonValue[] | null | undefined,
): PersonValue[] {
  const had = new Set((before ?? []).map((p) => p.id));
  return (after ?? []).filter((p) => !had.has(p.id));
}

/** The quick filter's key for rows with nobody assigned. */
export const UNASSIGNED = "__unassigned";

/** Whether a row's assignees match the people picked in the quick filter
 *  (any of them; UNASSIGNED matches an empty cell). */
export function matchesPeopleFilter(
  value: unknown,
  picked: string[],
): boolean {
  if (picked.length === 0) return true;
  const ids = Array.isArray(value)
    ? value
        .map((v) =>
          v && typeof v === "object" && "id" in v
            ? String((v as { id: unknown }).id)
            : "",
        )
        .filter(Boolean)
    : [];
  if (ids.length === 0) return picked.includes(UNASSIGNED);
  return ids.some((id) => picked.includes(id));
}

export type AssigneeCounts = Map<
  string,
  { count: number; person: PersonValue | null }
>;

/** How many rows each person has (and UNASSIGNED), for the people bar. */
export function countAssignees(values: unknown[]): AssigneeCounts {
  const counts: AssigneeCounts = new Map();
  for (const value of values) {
    const people = Array.isArray(value)
      ? (value as PersonValue[]).filter((p) => p && p.id)
      : [];
    if (people.length === 0) {
      const none = counts.get(UNASSIGNED) ?? { count: 0, person: null };
      counts.set(UNASSIGNED, { ...none, count: none.count + 1 });
      continue;
    }
    for (const p of people) {
      const entry = counts.get(p.id) ?? { count: 0, person: p };
      counts.set(p.id, { count: entry.count + 1, person: entry.person ?? p });
    }
  }
  return counts;
}
