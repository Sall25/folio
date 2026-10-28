import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Page, PageCategory, ID } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { fetchPages, fetchPageOrShared } from "../api/pages";
import { useMemo } from "react";
import type { PageTreeNode } from "../types";
import { useCurrentWorkspace } from "./use-workspaces";
import { withLocalPages } from "src/lib/local-pages";

// ─── the ONE base query — everything below is a lens over this ──────────────
// The workspace id stays in the query key even though fetchPages no longer
// filters by it: RLS returns a different set depending on your current
// workspace, so each workspace must cache separately and a switch must
// refetch.
export function usePagesBase<T>(select?: (pages: Page[]) => T) {
  const { workspaceId } = useCurrentWorkspace();
  return useQuery({
    queryKey: queryKeys.pages.lists(workspaceId ?? ""),
    queryFn: async () => withLocalPages(await fetchPages()),
    enabled: !!workspaceId,
    select,
  });
}

// ─── the lenses ──────────────────────────────────────────────────────────────

// Pages people can pick or open (search, library, mentions, move to…):
// never database rows or pages in the trash.
export function usePages() {
  return usePagesBase((pages) =>
    pages.filter((p) => p.sourceId == null && p.deletedAt == null),
  );
}

export function usePagesByCategory(category: PageCategory) {
  return usePagesBase((pages) =>
    pages.filter(
      (p) =>
        p.sourceId == null && p.deletedAt == null && p.category === category,
    ),
  );
}

export function useChildPages(parentId: ID) {
  return usePagesBase((pages) =>
    pages.filter((p) => p.parentId === parentId && p.deletedAt == null),
  );
}

export function useRows(sourceId: ID) {
  return usePagesBase((pages) =>
    pages.filter(
      (p) =>
        p.sourceId === sourceId &&
        p.deletedAt == null &&
        p.category !== "Template",
    ),
  );
}

// ─── the detail query ────────────────────────────────────────────────────────
// Seeded from the pages list (which already holds every page) so opening a
// page never waits on its own fetch — and works offline, where that fetch
// can't run. The list's fetch time is passed along, so a stale seed still
// refetches as soon as the network allows.
export function usePage(id: ID | null) {
  const qc = useQueryClient();
  const { workspaceId } = useCurrentWorkspace();
  const listKey = queryKeys.pages.lists(workspaceId ?? "");
  return useQuery({
    queryKey: queryKeys.pages.detail(id ?? ""),
    // Also finds pages shared with you from another workspace.
    queryFn: () => fetchPageOrShared(id!),
    enabled: id != null,
    initialData: () =>
      id != null
        ? qc.getQueryData<Page[]>(listKey)?.find((p) => p.id === id)
        : undefined,
    initialDataUpdatedAt: () => qc.getQueryState(listKey)?.dataUpdatedAt,
  });
}

// ─── breadcrumbs ─────────────────────────────────────────────────────────────
export function useBreadcrumbs(pageId: ID | null) {
  return usePagesBase((pages) => {
    if (pageId == null) return [];

    const byId = new Map(
      pages.filter((p) => p.deletedAt == null).map((p) => [p.id, p]),
    );

    const chain: Page[] = [];
    let current = byId.get(pageId);
    const seen = new Set<ID>();

    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      chain.push(current);
      current =
        current.parentId != null ? byId.get(current.parentId) : undefined;
    }

    return chain.reverse();
  });
}

// ─── recently updated ────────────────────────────────────────────────────────
export function useRecentPages(limit?: number) {
  return usePagesBase((pages) => {
    const sorted = [...pages]
      .filter((p) => /*p.sourceId == null &&*/ p.deletedAt == null)
      .sort(
        (a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt),
      );
    return limit != null ? sorted.slice(0, limit) : sorted;
  });
}

// ─── tabs ────────────────────────────────────────────────────────────────────
export function useTabPages(tabIds: ID[]) {
  return usePagesBase((pages) => {
    const byId = new Map(pages.map((p) => [p.id, p]));
    return tabIds
      .map((id) => byId.get(id))
      .filter((p): p is Page => p !== undefined);
  });
}

// ─── the tree: flat pages → nested PageTreeNode[], grouped by category ──────
// Joined teamspaces from other workspaces land in the Teamspaces bucket like
// any other root — their root page has category "Teamspaces", parent null.
export function usePageTree() {
  const query = usePagesBase((pages) =>
    pages.filter((p) => p.deletedAt == null),
  );

  const pages = query.data;

  const tree = useMemo(() => {
    if (!pages) return {} as Record<PageCategory, PageTreeNode[]>;
    return buildTree(pages);
  }, [pages]);

  return { ...query, tree };
}

function buildTree(pages: Page[]): Record<PageCategory, PageTreeNode[]> {
  const childrenOf = new Map<string, Page[]>();
  for (const p of pages) {
    if (p.parentId == null) continue;
    const kids = childrenOf.get(p.parentId) ?? [];
    kids.push(p);
    childrenOf.set(p.parentId, kids);
  }

  const seen = new Set<string>();
  const buildNode = (page: Page): PageTreeNode => {
    seen.add(page.id);
    const kids = (childrenOf.get(page.id) ?? [])
      .filter((c) => !seen.has(c.id))
      .map(buildNode);
    return { page, children: kids };
  };

  const byCategory = {} as Record<PageCategory, PageTreeNode[]>;
  for (const p of pages) {
    if (p.parentId != null) continue;
    (byCategory[p.category] ??= []).push(buildNode(p));
  }
  return byCategory;
}
