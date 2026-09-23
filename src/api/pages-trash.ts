import type { ID, Page } from "src/types";
import { patchPage, deletePage, fetchPages } from "./pages";

// Soft-delete (trash) operations for pages, cascading over the subtree so a
// page and its descendants trash/restore/purge together.
//
// fetchPages() is unfiltered — RLS returns your workspace's pages plus pages
// of teamspaces you've joined — so "which trash" is decided by a scope
// predicate from the caller (see useTrashScope), never by the API.

interface TrashablePage extends Page {
  deletedAt?: number | null;
}

export type PageScope = (page: Page) => boolean;

// Collect a page and all descendants (by parentId).
function collectSubtree(pages: Page[], rootId: ID): ID[] {
  const byParent = new Map<ID | null, Page[]>();
  for (const p of pages) {
    const key = (p.parentId ?? null) as ID | null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(p);
  }
  const ids: ID[] = [];
  const walk = (id: ID) => {
    ids.push(id);
    for (const child of byParent.get(id) ?? []) walk(child.id);
  };
  walk(rootId);
  return ids;
}

// Trash a page + subtree: set deletedAt (same timestamp across the subtree).
// The workspace id is no longer needed (the subtree is found in whatever RLS
// returns); the parameter is kept optional so existing callers still compile.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function trashPage(pageId: ID, _workspaceId?: ID): Promise<void> {
  const pages = await fetchPages();
  const ids = collectSubtree(pages, pageId);
  const deletedAt = Date.now();
  await Promise.all(
    ids.map((id) => patchPage(id, { deletedAt } as Partial<TrashablePage>)),
  );
}

// Restore a page + subtree (clear deletedAt).
export async function restorePage(pageId: ID): Promise<void> {
  const pages = await fetchPages();
  const ids = collectSubtree(pages, pageId);
  await Promise.all(
    ids.map((id) =>
      patchPage(id, { deletedAt: null } as Partial<TrashablePage>),
    ),
  );
}

// Permanently delete a page + subtree (leaf-first to respect FKs).
export async function deletePagePermanently(pageId: ID): Promise<void> {
  const pages = await fetchPages();
  const ids = collectSubtree(pages, pageId).reverse();
  for (const id of ids) {
    await deletePage(id);
  }
}

// Trashed pages within the given scope.
export async function fetchTrashedPages(
  inScope: PageScope,
): Promise<TrashablePage[]> {
  const all = (await fetchPages()) as TrashablePage[];
  return all.filter((p) => p.deletedAt != null && inScope(p));
}

// Empty the trash for a scope: permanently delete every trashed ROOT in it
// that the caller is allowed to purge (a trashed child is covered by its
// trashed parent's subtree).
export async function emptyTrash(
  inScope: PageScope,
  canPurge: PageScope,
): Promise<void> {
  const trashed = await fetchTrashedPages(inScope);
  const trashedIds = new Set(trashed.map((p) => p.id));
  const roots = trashed.filter(
    (p) => (!p.parentId || !trashedIds.has(p.parentId)) && canPurge(p),
  );
  for (const root of roots) {
    await deletePagePermanently(root.id);
  }
}
