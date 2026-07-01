import { useQuery } from "@tanstack/react-query";
import type { Page, PageCategory, ID } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { fetchPages, fetchPage } from "../api/pages";
import { useMemo } from "react";
import type { PageTreeNode } from "../types";

// ─── the ONE base query — everything below is a lens over this ──────────────
export function usePagesBase<T>(select?: (pages: Page[]) => T) {
  return useQuery({
    queryKey: queryKeys.pages.lists(),
    queryFn: fetchPages,
    select,
  });
}

// ─── the lenses ──────────────────────────────────────────────────────────────

export function usePages() {
  return usePagesBase((pages) => pages.filter((p) => p.sourceId == null));
}

export function usePagesByCategory(category: PageCategory) {
  return usePagesBase((pages) =>
    pages.filter((p) => p.sourceId == null && p.category === category),
  );
}

export function useChildPages(parentId: ID) {
  return usePagesBase((pages) => pages.filter((p) => p.parentId === parentId));
}

export function useRows(sourceId: ID) {
  return usePagesBase((pages) => pages.filter((p) => p.sourceId === sourceId));
}

// ─── the detail query ────────────────────────────────────────────────────────
export function usePage(id: ID | null) {
  return useQuery({
    queryKey: queryKeys.pages.detail(id ?? ""),
    queryFn: () => fetchPage(id!),
    enabled: id != null,
  });
}

// ─── breadcrumbs ─────────────────────────────────────────────────────────────
export function useBreadcrumbs(pageId: ID | null) {
  return usePagesBase((pages) => {
    if (pageId == null) return [];

    const byId = new Map(pages.map((p) => [p.id, p]));

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
      .filter((p) => p.sourceId == null)
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
// Teamspace-pages (category "Teamspaces") fall into the Teamspaces bucket like
// any other root — a teamspace is just a page.
export function usePageTree() {
  const query = usePagesBase((pages) => pages);

  const pages = query.data;

  const tree = useMemo(() => {
    if (!pages) return {} as Record<PageCategory, PageTreeNode[]>;
    return buildTree(pages);
  }, [pages]);

  return { ...query, tree };
}

// pure: flat pages → { category → roots[] }, each root a nested PageTreeNode
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
