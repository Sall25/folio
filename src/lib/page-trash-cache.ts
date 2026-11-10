import type { QueryClient } from "@tanstack/react-query";
import type { ID, Page } from "src/types";
import { queryKeys } from "src/lib/queryKeys";

// Moving pages to the trash (or back) in the cached page lists right away,
// before the server hears of it, so it works offline: the page leaves the
// sidebar and shows in the trash at once (use-trash-page.ts, use-trash.ts).
// The trash view reads the same lists, so both stay in step.

/** Every page in the cache's lists, once. */
function cachedPages(qc: QueryClient): Page[] {
  const seen = new Map<ID, Page>();
  for (const [, data] of qc.getQueriesData<Page[] | Page>({
    queryKey: queryKeys.pages.all,
  })) {
    if (Array.isArray(data)) data.forEach((p) => seen.set(p.id, p));
  }
  return [...seen.values()];
}

/** The page and every page inside it, from the cache (as trashPage finds
 *  them on the server: by parent). */
export function cachedSubtree(qc: QueryClient, rootId: ID): ID[] {
  const byParent = new Map<ID, Page[]>();
  for (const p of cachedPages(qc)) {
    if (!p.parentId) continue;
    const list = byParent.get(p.parentId) ?? [];
    list.push(p);
    byParent.set(p.parentId, list);
  }
  const ids: ID[] = [];
  const seen = new Set<ID>();
  const walk = (id: ID) => {
    if (seen.has(id)) return;
    seen.add(id);
    ids.push(id);
    for (const child of byParent.get(id) ?? []) walk(child.id);
  };
  walk(rootId);
  return ids;
}

export type DeletedAtSnapshot = Map<ID, number | null | undefined>;

/** Sets deletedAt on these pages in every cached list and page. Returns
 *  what they had, to undo with restoreDeletedAt. */
export function setCachedDeletedAt(
  qc: QueryClient,
  ids: ID[],
  deletedAt: number | null,
): DeletedAtSnapshot {
  const wanted = new Set(ids);
  const before: DeletedAtSnapshot = new Map();
  for (const p of cachedPages(qc)) {
    if (wanted.has(p.id)) before.set(p.id, p.deletedAt);
  }
  const apply = (p: Page): Page =>
    wanted.has(p.id) ? { ...p, deletedAt } : p;
  qc.setQueriesData<Page[] | Page>({ queryKey: queryKeys.pages.all }, (data) =>
    Array.isArray(data)
      ? data.map(apply)
      : data && wanted.has(data.id)
        ? apply(data)
        : data,
  );
  return before;
}

export function restoreDeletedAt(qc: QueryClient, before: DeletedAtSnapshot) {
  qc.setQueriesData<Page[] | Page>({ queryKey: queryKeys.pages.all }, (data) => {
    const undo = (p: Page): Page =>
      before.has(p.id) ? { ...p, deletedAt: before.get(p.id) ?? null } : p;
    return Array.isArray(data) ? data.map(undo) : data ? undo(data) : data;
  });
}
