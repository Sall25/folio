import { useQuery } from "@tanstack/react-query";
import type { Page, PageCategory, ID } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { fetchPages, fetchPage } from "../api/pages";
import { useMemo } from "react";
import type { PageTreeNode } from "../types";

// ─── the ONE base query — everything below is a lens over this ──────────────
// Not exported (or exported for rare "give me everything raw" needs).
export function usePagesBase<T>(select?: (pages: Page[]) => T) {
  return useQuery({
    queryKey: queryKeys.pages.lists(),
    queryFn: fetchPages,
    select,
  });
}

// ─── the lenses ──────────────────────────────────────────────────────────────

// all NORMAL pages (not database rows) — the sidebar's raw material
export function usePages() {
  return usePagesBase((pages) => pages.filter((p) => p.sourceId == null));
}

// one sidebar section
export function usePagesByCategory(category: PageCategory) {
  return usePagesBase((pages) =>
    pages.filter((p) => p.sourceId == null && p.category === category),
  );
}

// direct children of a page (for tree rendering / expand)
export function useChildPages(parentId: ID) {
  return usePagesBase((pages) => pages.filter((p) => p.parentId === parentId));
}

// the rows of a database — pages WITH this sourceId
export function useRows(sourceId: ID) {
  return usePagesBase((pages) => pages.filter((p) => p.sourceId === sourceId));
}

// ─── the detail query — the one separate fetch ───────────────────────────────
export function usePage(id: ID | null) {
  return useQuery({
    queryKey: queryKeys.pages.detail(id ?? ""),
    queryFn: () => fetchPage(id!),
    enabled: id != null,
  });
}

// ─── breadcrumbs: the ancestor chain from root → this page ──────────────────
// Walks UP via parentId (the reverse of collectSubtree's downward walk).
export function useBreadcrumbs(pageId: ID | null) {
  return usePagesBase((pages) => {
    if (pageId == null) return [];

    // id → page lookup map (module-03 pattern 1) so each hop is O(1)
    const byId = new Map(pages.map((p) => [p.id, p]));

    const chain: Page[] = [];
    let current = byId.get(pageId);
    const seen = new Set<ID>(); // cycle guard, same discipline as collectSubtree

    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      chain.push(current);
      current =
        current.parentId != null ? byId.get(current.parentId) : undefined;
    }

    return chain.reverse(); // walked child→root; breadcrumbs read root→child
  });
}

// ─── recently updated: most recent first ────────────────────────────────────
// updatedAt is null for never-updated pages — fall back to createdAt, so a
// fresh page counts as "active now", not epoch-zero. (The tripwire, handled.)
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

// ─── tabs: resolve an ordered list of open-tab page ids to pages ─────────────
// Tab order comes from UI state (the order tabs were opened/arranged), so the
// CALLER owns the id order; this lens resolves ids → pages preserving it, and
// drops ids whose page no longer exists (deleted while open in a tab).
export function useTabPages(tabIds: ID[]) {
  return usePagesBase((pages) => {
    const byId = new Map(pages.map((p) => [p.id, p]));
    return tabIds
      .map((id) => byId.get(id))
      .filter((p): p is Page => p !== undefined);
  });
}

// ─── the tree: flat pages → nested PageTreeNode[], grouped by category ──────
// This is the sidebar's shape. Built from parentId (single source of truth);
// `children` is derived here, never stored.
//
// Memoized against the raw pages array: select returns a fresh tree each call,
// so without useMemo every pages change re-renders the entire sidebar. This is
// the one lens where referential stability is load-bearing, not optional.
export function usePageTree() {
  const query = usePagesBase((pages) =>
    pages.filter((p) => p.sourceId == null),
  );

  const pages = query.data;

  const tree = useMemo(() => {
    if (!pages) return {} as Record<PageCategory, PageTreeNode[]>;
    return buildTree(pages);
  }, [pages]);

  return { ...query, tree };
}

// pure: flat pages → { category → roots[] }, each root a nested PageTreeNode
function buildTree(pages: Page[]): Record<PageCategory, PageTreeNode[]> {
  // 1. adjacency map: parentId → child pages (module-03 pattern 3)
  const childrenOf = new Map<string, Page[]>();
  for (const p of pages) {
    if (p.parentId == null) continue;
    const kids = childrenOf.get(p.parentId) ?? [];
    kids.push(p);
    childrenOf.set(p.parentId, kids);
  }

  // 2. recursively build a node and its subtree (with cycle guard)
  const seen = new Set<string>();
  const buildNode = (page: Page): PageTreeNode => {
    seen.add(page.id);
    const kids = (childrenOf.get(page.id) ?? [])
      .filter((c) => !seen.has(c.id)) // guard against a parentId cycle
      .map(buildNode);
    return { page, children: kids };
  };

  // 3. roots = pages with no parent, bucketed by category
  const byCategory = {} as Record<PageCategory, PageTreeNode[]>;
  for (const p of pages) {
    if (p.parentId != null) continue;
    (byCategory[p.category] ??= []).push(buildNode(p));
  }
  return byCategory;
}
