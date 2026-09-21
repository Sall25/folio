import type { ID, Page } from "src/types";
import { patchPage, deletePage, fetchPages } from "./pages";

// Soft-delete (trash) operations for pages, cascading over the subtree so a
// page and its descendants trash/restore/purge together.

interface TrashablePage extends Page {
  deletedAt?: number | null;
}

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
export async function trashPage(pageId: ID, workspaceId: ID): Promise<void> {
  const pages = await fetchPages(workspaceId);
  const ids = collectSubtree(pages, pageId);
  const deletedAt = Date.now();
  await Promise.all(
    ids.map((id) => patchPage(id, { deletedAt } as Partial<TrashablePage>)),
  );
}

// Restore a page + subtree (clear deletedAt).
export async function restorePage(pageId: ID, workspaceId: ID): Promise<void> {
  const pages = await fetchPages(workspaceId);
  const ids = collectSubtree(pages, pageId);
  await Promise.all(
    ids.map((id) =>
      patchPage(id, { deletedAt: null } as Partial<TrashablePage>),
    ),
  );
}

// Permanently delete a page + subtree (leaf-first to respect FKs).
export async function deletePagePermanently(
  pageId: ID,
  workspaceId: ID,
): Promise<void> {
  const pages = await fetchPages(workspaceId);
  const ids = collectSubtree(pages, pageId).reverse();
  for (const id of ids) {
    await deletePage(id);
  }
}

// Trashed pages only.
export async function fetchTrashedPages(
  workspaceId: ID,
): Promise<TrashablePage[]> {
  const all = (await fetchPages(workspaceId)) as TrashablePage[];
  return all.filter((p) => p.deletedAt != null);
}

// Empty the whole trash (permanent-delete every trashed root).
export async function emptyTrash(workspaceId: ID): Promise<void> {
  const trashed = await fetchTrashedPages(workspaceId);
  // Only purge roots of trashed subtrees (a trashed child is covered by its
  // trashed parent's subtree). A page is a "trashed root" if its parent isn't
  // also trashed.
  const trashedIds = new Set(trashed.map((p) => p.id));
  const roots = trashed.filter(
    (p) => !p.parentId || !trashedIds.has(p.parentId),
  );
  for (const root of roots) {
    await deletePagePermanently(root.id, workspaceId);
  }
}
