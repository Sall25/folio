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

// ─── recently updated: most recent first ────────────────────────────────────
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
export function useTabPages(tabIds: ID[]) {
  return usePagesBase((pages) => {
    const byId = new Map(pages.map((p) => [p.id, p]));
    return tabIds
      .map((id) => byId.get(id))
      .filter((p): p is Page => p !== undefined);
  });
}

// ─── the tree: flat pages → sidebar sections ────────────────────────────────
// Roots are bucketed two ways now: by teamspaceId (when set) into byTeamspace,
// otherwise by category into byCategory. teamspaceId is the source of truth for
// teamspace membership; the old "Teamspaces" category value is retired.
//
// Memoized against the raw pages array — the select returns a fresh structure
// each call, so without useMemo every pages change re-renders the whole sidebar.
export interface PageSections {
  byCategory: Record<PageCategory, PageTreeNode[]>;
  byTeamspace: Record<ID, PageTreeNode[]>;
}

const EMPTY_SECTIONS: PageSections = {
  byCategory: {} as Record<PageCategory, PageTreeNode[]>,
  byTeamspace: {},
};

export function usePageTree() {
  const query = usePagesBase((pages) => pages);

  const pages = query.data;

  const tree = useMemo(() => {
    if (!pages) return EMPTY_SECTIONS;
    return buildTree(pages);
  }, [pages]);

  return { ...query, tree };
}

// pure: flat pages → { byCategory, byTeamspace }, each root a nested PageTreeNode
function buildTree(pages: Page[]): PageSections {
  // 1. adjacency map: parentId → child pages
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
      .filter((c) => !seen.has(c.id))
      .map(buildNode);
    return { page, children: kids };
  };

  // 3. roots: teamspaceId-bearing roots → byTeamspace; the rest → byCategory.
  const byCategory = {} as Record<PageCategory, PageTreeNode[]>;
  const byTeamspace: Record<ID, PageTreeNode[]> = {};
  for (const p of pages) {
    if (p.parentId != null) continue;
    const node = buildNode(p);
    if (p.teamspaceId != null) {
      (byTeamspace[p.teamspaceId] ??= []).push(node);
    } else {
      (byCategory[p.category] ??= []).push(node);
    }
  }
  return { byCategory, byTeamspace };
}
