// Remembers each database's last-known column count so the loading skeleton
// can render a faithful number of columns on COLD load — before the DataSource
// (which owns the schema) has arrived. The schema was moved off the node onto
// the DataSource, so the node carries no property list to size the skeleton
// from; this fills that gap. Keyed by sourceId, persisted in localStorage so it
// survives a full page reload (the slow first paint we actually care about).
// Best-effort: any read/write failure silently falls back to the default.

import type { ID } from "src/types";

const KEY = "db-skeleton-cols";

type Hints = Record<ID, number>;

function read(): Hints {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Hints) : {};
  } catch {
    return {};
  }
}

export function getColumnHint(sourceId: ID | null | undefined): number | null {
  if (!sourceId) return null;
  const n = read()[sourceId];
  return typeof n === "number" && n > 0 ? n : null;
}

export function setColumnHint(
  sourceId: ID | null | undefined,
  count: number,
): void {
  if (!sourceId || !(count > 0)) return;
  try {
    const hints = read();
    if (hints[sourceId] === count) return; // no-op write guard
    hints[sourceId] = count;
    localStorage.setItem(KEY, JSON.stringify(hints));
  } catch {
    // ignore — the hint is a nicety, never load-bearing
  }
}
