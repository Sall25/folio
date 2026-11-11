import { useSyncExternalStore } from "react";
import type { DatabaseProperty, DatabaseView, ID } from "src/types";

// How much room a database has, as one of three sizes. It follows the
// database's own visible width (beside the sidebar, inside a column, in a
// narrow window), not the screen's, the way the editor's layout does.
//
// The database node writes it (useDbVisibleWidth) both as `data-db-size` on
// its .db-node, for CSS, and here, for the views that change behaviour (the
// board's dots, the calendar's week, the table's row list). Kept per
// database id: its views render in other React trees (node views), so a
// context wouldn't reach them.

export type DbSize = "phone" | "narrow" | "wide";

/** Below this the database lays out for a phone. */
export const DB_PHONE_MAX = 560;
/** Below this (and above a phone) things shrink before they scroll. */
export const DB_NARROW_MAX = 900;

export function dbSizeFor(width: number): DbSize {
  if (width <= 0) return "wide"; // not laid out yet
  if (width < DB_PHONE_MAX) return "phone";
  if (width < DB_NARROW_MAX) return "narrow";
  return "wide";
}

const sizes = new Map<string, DbSize>();
const listeners = new Set<() => void>();

export function setDbSize(databaseId: string, size: DbSize) {
  if (sizes.get(databaseId) === size) return;
  sizes.set(databaseId, size);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The size of a database's room (its id: attrs.id). */
export function useDbSize(databaseId: string | null | undefined): DbSize {
  return useSyncExternalStore(
    subscribe,
    () => (databaseId ? (sizes.get(databaseId) ?? "wide") : "wide"),
    () => "wide",
  );
}

/** The column a table freezes. A table kept as a grid on a phone ("Show as
 *  table") freezes its title column when no column is frozen. */
export function frozenPropertyIdFor(
  view: DatabaseView | null | undefined,
  size: DbSize,
  properties: DatabaseProperty[],
): ID | null {
  if (!view || view.type !== "table") return null;
  if (view.frozenPropertyId) return view.frozenPropertyId;
  if (size === "phone" && view.phoneTable) {
    return properties.find((p) => p.config.type === "title")?.id ?? null;
  }
  return null;
}
