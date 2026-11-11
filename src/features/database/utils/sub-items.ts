import type {
  DatabaseProperty,
  DatabaseView,
  ID,
  Page,
  SubItemsSettings,
} from "src/types";
import { relationRecordIds } from "src/lib/relation-ids";

// Sub-items: rows under rows, at any depth. Built on a relation of the
// database with itself, made as a pair: the "Parent" side is stored (a row's
// parent id) and marked `subItems`; the "Sub-items" side is its mirror,
// worked out from everyone's Parent. Nothing else is special: they're
// relation properties, renamable, and rollups / filters work on them.
//
// This file turns a view's rows into what it shows: nested (each row under
// its parent, opened or closed), every row on its own, or the top level
// only, with what each row needs to draw itself (depth, how many rows under
// it, open or not).

export interface SubItemPair {
  /** The stored side: each row's parent. */
  parent: DatabaseProperty;
  /** The derived side, when there is one. */
  children: DatabaseProperty | null;
}

export interface SubItemInfo {
  depth: number;
  /** Rows directly under it, in the whole database (not just this view). */
  childCount: number;
  open: boolean;
}

export const DEFAULT_SUB_ITEMS: Required<SubItemsSettings> = {
  display: "nested",
  filters: "all",
  expanded: false,
};

/** The database's sub-item pair, if it has one. */
export function subItemPair(
  properties: DatabaseProperty[],
  sourceId: ID | null | undefined,
): SubItemPair | null {
  const parent = properties.find(
    (p) =>
      p.config.type === "relation" &&
      p.config.subItems === true &&
      (!sourceId || p.config.targetSourceId === sourceId),
  );
  if (!parent || parent.config.type !== "relation") return null;
  const mirrorId = parent.config.mirrorPropertyId;
  const children = mirrorId
    ? (properties.find((p) => p.id === mirrorId) ?? null)
    : null;
  return { parent, children };
}

/** A row's parent id (the first link; a row has one parent). */
export function parentIdOf(row: Page, parentPropId: ID): ID | null {
  return relationRecordIds(row.values?.[parentPropId])[0] ?? null;
}

/** Views that show rows inside rows; board and gallery count them instead,
 *  calendar and form ignore them. */
export function nestsRows(view: DatabaseView | null | undefined): boolean {
  return view?.type === "table" || view?.type === "list" || view?.type === "timeline";
}
export function countsSubItems(view: DatabaseView | null | undefined): boolean {
  return nestsRows(view) || view?.type === "board" || view?.type === "gallery";
}

export interface SubItemLayout {
  rows: Page[];
  info: Record<ID, SubItemInfo>;
}

/**
 * What a view shows, given:
 *  - `all`: every row of the database, in the view's sort (unfiltered);
 *  - `shown`: the rows the view's filters and search keep, in that order;
 *  - `open`: rows opened or closed by hand (others follow `expanded`).
 */
export function layoutSubItems(
  all: Page[],
  shown: Page[],
  parentPropId: ID,
  settings: SubItemsSettings | undefined,
  open: Record<ID, boolean>,
  nests: boolean,
): SubItemLayout {
  const s = { ...DEFAULT_SUB_ITEMS, ...(settings ?? {}) };
  const byId = new Map(all.map((r) => [r.id, r]));
  const rank = new Map(all.map((r, i) => [r.id, i]));

  // A parent that isn't a row of this database (deleted, or another one)
  // makes the row top level.
  const parentOf = (r: Page): ID | null => {
    const p = parentIdOf(r, parentPropId);
    return p && p !== r.id && byId.has(p) ? p : null;
  };

  const childrenOf = new Map<ID, Page[]>();
  for (const r of all) {
    const p = parentOf(r);
    if (!p) continue;
    const list = childrenOf.get(p);
    if (list) list.push(r);
    else childrenOf.set(p, [r]);
  }
  const isOpen = (id: ID) => open[id] ?? s.expanded;
  const info: Record<ID, SubItemInfo> = {};
  const describe = (r: Page, depth: number) => {
    info[r.id] = {
      depth,
      childCount: childrenOf.get(r.id)?.length ?? 0,
      open: isOpen(r.id),
    };
  };

  if (s.display === "flat") {
    shown.forEach((r) => describe(r, 0));
    return { rows: shown, info };
  }
  if (s.display === "top" || !nests) {
    const rows = shown.filter((r) => !parentOf(r));
    rows.forEach((r) => describe(r, 0));
    return { rows, info };
  }

  // Nested. Which rows take part: with filters "all", the rows the filters
  // keep plus their parents (so a match stays where it belongs); with
  // "top", the top-level rows the filters keep plus everything under them.
  const included = new Set<ID>();
  if (s.filters === "top") {
    const addDown = (id: ID, seen: Set<ID>) => {
      if (seen.has(id)) return;
      seen.add(id);
      included.add(id);
      childrenOf.get(id)?.forEach((c) => addDown(c.id, seen));
    };
    const seen = new Set<ID>();
    shown.filter((r) => !parentOf(r)).forEach((r) => addDown(r.id, seen));
  } else {
    for (const r of shown) {
      let cur: Page | undefined = r;
      const guard = new Set<ID>();
      while (cur && !guard.has(cur.id)) {
        guard.add(cur.id);
        included.add(cur.id);
        const p = parentOf(cur);
        cur = p ? byId.get(p) : undefined;
      }
    }
  }

  // Order: the view's order; a parent brought in only for context sits
  // where its first shown descendant would.
  const shownRank = new Map(shown.map((r, i) => [r.id, i]));
  const placeRank = new Map<ID, number>();
  const placeOf = (id: ID, guard = new Set<ID>()): number => {
    const known = placeRank.get(id);
    if (known != null) return known;
    if (guard.has(id)) return Number.MAX_SAFE_INTEGER;
    guard.add(id);
    let best =
      shownRank.get(id) ??
      (s.filters === "top" ? (rank.get(id) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER);
    for (const c of childrenOf.get(id) ?? [])
      if (included.has(c.id)) best = Math.min(best, placeOf(c.id, guard));
    placeRank.set(id, best);
    return best;
  };
  const byPlace = (a: Page, b: Page) =>
    placeOf(a.id) - placeOf(b.id) ||
    (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0);

  const rows: Page[] = [];
  const visited = new Set<ID>();
  const walk = (r: Page, depth: number) => {
    if (visited.has(r.id)) return; // a loop of parents
    visited.add(r.id);
    describe(r, depth);
    rows.push(r);
    if (!isOpen(r.id)) return;
    (childrenOf.get(r.id) ?? [])
      .filter((c) => included.has(c.id))
      .sort(byPlace)
      .forEach((c) => walk(c, depth + 1));
  };
  const roots = all.filter((r) => included.has(r.id) && !parentOf(r));
  roots.sort(byPlace).forEach((r) => walk(r, 0));

  // Rows caught in a loop of parents (A under B under A) hang under no top
  // row: they're shown at the top. (Rows hidden under a closed row aren't.)
  const reachable = new Set<ID>();
  const reach = (id: ID) => {
    if (reachable.has(id)) return;
    reachable.add(id);
    childrenOf.get(id)?.forEach((c) => reach(c.id));
  };
  roots.forEach((r) => reach(r.id));
  all
    .filter((r) => included.has(r.id) && !reachable.has(r.id))
    .sort(byPlace)
    .forEach((r) => {
      if (!visited.has(r.id)) walk(r, 0);
      reach(r.id);
    });

  return { rows, info };
}
