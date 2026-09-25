import { useCallback, useMemo } from "react";
import { useLocalStorage } from "../hooks/use-local-storage";
import type { ID, PageCategory, PageTreeNode } from "src/types";

export type SortMode = "recent" | "custom";

// Sections the sidebar can show, order and hide. Page sections are keyed by
// their PageCategory; "Rooms" is the one non-page section. Page code keeps
// using PageCategory — only ordering/hiding uses this wider key.
export type SidebarSectionKey = PageCategory | "Rooms";

export const isPageSection = (key: SidebarSectionKey): key is PageCategory =>
  key !== "Rooms";

export function scopeKeyForRoots(category: PageCategory): string {
  return `category:${category}`;
}

export function scopeKeyForChildren(parentId: ID): string {
  return `parent:${parentId}`;
}

export function getSortMode(
  map: Record<string, SortMode>,
  category: PageCategory,
): SortMode {
  return map[category] ?? "recent";
}

function byRecency(a: PageTreeNode, b: PageTreeNode): number {
  const at = a.page.updatedAt ?? a.page.createdAt;
  const bt = b.page.updatedAt ?? b.page.createdAt;
  return bt - at;
}

// Order one set of siblings. "recent" is always computed fresh from
// updatedAt/createdAt. "custom" replays the persisted id order, then appends
// any ids not yet in it (new pages) at the end, preserving their natural
// relative order.
export function sortSiblings(
  nodes: PageTreeNode[],
  scopeKey: string,
  mode: SortMode,
  orderMap: Record<string, ID[]>,
): PageTreeNode[] {
  if (mode === "recent") return [...nodes].sort(byRecency);

  const order = orderMap[scopeKey] ?? [];
  const byId = new Map(nodes.map((n) => [n.page.id, n]));
  const ordered: PageTreeNode[] = [];
  for (const id of order) {
    const n = byId.get(id);
    if (n) {
      ordered.push(n);
      byId.delete(id);
    }
  }
  for (const n of nodes) {
    if (byId.has(n.page.id)) ordered.push(n);
  }
  return ordered;
}

// Recursively apply a section's sort mode to its whole subtree — one mode,
// set once per section, governs every level beneath it.
export function applySectionSort(
  roots: PageTreeNode[],
  category: PageCategory,
  mode: SortMode,
  orderMap: Record<string, ID[]>,
): PageTreeNode[] {
  const sortChildren = (nodes: PageTreeNode[]): PageTreeNode[] =>
    nodes.map((n) => ({
      ...n,
      children: sortChildren(
        sortSiblings(
          n.children,
          scopeKeyForChildren(n.page.id),
          mode,
          orderMap,
        ),
      ),
    }));

  return sortChildren(
    sortSiblings(roots, scopeKeyForRoots(category), mode, orderMap),
  );
}

// Recompute a scope's order array after moving `movedId` to sit before/after
// `targetId`, or to the end (dropped into empty space / nested with no
// sibling reference). `currentIds` should be the scope's CURRENTLY DISPLAYED
// order (post-sort), so untouched siblings keep their visible relative order
// the first time a section switches into custom mode.
export function reorderScope(
  currentIds: ID[],
  movedId: ID,
  targetId: ID | null,
  position: "before" | "after" | "end",
): ID[] {
  const withoutMoved = currentIds.filter((id) => id !== movedId);
  if (targetId == null || position === "end") {
    return [...withoutMoved, movedId];
  }
  const idx = withoutMoved.indexOf(targetId);
  if (idx === -1) return [...withoutMoved, movedId];
  const insertAt = position === "before" ? idx : idx + 1;
  return [
    ...withoutMoved.slice(0, insertAt),
    movedId,
    ...withoutMoved.slice(insertAt),
  ];
}

export function useSectionSortModes() {
  return useLocalStorage<Record<string, SortMode>>("folio:section-sort", {});
}

export function useCustomOrder() {
  return useLocalStorage<Record<string, ID[]>>("folio:custom-order", {});
}

// category is order-independent (root membership only), so this can walk the
// RAW tree — no need to wait for sorting.
export function buildCategoryByPageId(
  tree: Record<PageCategory, PageTreeNode[]>,
): Map<ID, PageCategory> {
  const map = new Map<ID, PageCategory>();
  const walk = (nodes: PageTreeNode[], category: PageCategory) => {
    for (const n of nodes) {
      map.set(n.page.id, category);
      if (n.children.length) walk(n.children, category);
    }
  };
  for (const category of Object.keys(tree) as PageCategory[]) {
    walk(tree[category] ?? [], category);
  }
  return map;
}

// ── Section order (which section renders first, second, ...) ────────────────
// The set of sections itself is fixed and closed — this only controls their
// display order, client-only for now like everything else here.
export const DEFAULT_SECTION_ORDER: SidebarSectionKey[] = [
  "Recent",
  "Favorites",
  "Shared",
  "Private",
  "Rooms",
  "Teamspaces",
];

// Just the page sections of the default order (for building page trees).
export const DEFAULT_PAGE_SECTIONS: PageCategory[] =
  DEFAULT_SECTION_ORDER.filter(isPageSection);

// Generic version of the splice-to-position logic reorderScope uses for page
// ids — kept separate (not a shared refactor) so the already-working page
// path is untouched.
export function reorderList<T>(
  list: T[],
  moved: T,
  target: T,
  position: "before" | "after" | "end",
): T[] {
  const withoutMoved = list.filter((x) => x !== moved);
  if (position === "end") return [...withoutMoved, moved];
  const idx = withoutMoved.indexOf(target);
  if (idx === -1) return [...withoutMoved, moved];
  const insertAt = position === "before" ? idx : idx + 1;
  return [
    ...withoutMoved.slice(0, insertAt),
    moved,
    ...withoutMoved.slice(insertAt),
  ];
}

// Stored positions for known sections, then any known section not yet stored
// appended at the end (a new section like Rooms joins without reshuffling
// someone's saved order), dropping anything no longer a real section.
function normalizeOrder(stored: SidebarSectionKey[]): SidebarSectionKey[] {
  const known = DEFAULT_SECTION_ORDER;
  return [
    ...stored.filter((c) => known.includes(c)),
    ...known.filter((c) => !stored.includes(c)),
  ];
}

export function useSectionOrder() {
  const [stored, setStored] = useLocalStorage<SidebarSectionKey[]>(
    "folio:section-order",
    DEFAULT_SECTION_ORDER,
  );

  const order = useMemo(() => normalizeOrder(stored), [stored]);

  // Setter operates on the SAME normalized array the caller reads from, so an
  // arrayMove computed against `order` writes back a consistent order.
  const setOrder = useCallback(
    (
      next:
        | SidebarSectionKey[]
        | ((prev: SidebarSectionKey[]) => SidebarSectionKey[]),
    ) => {
      setStored((prevStored) => {
        const prevOrder = normalizeOrder(prevStored);
        return typeof next === "function" ? next(prevOrder) : next;
      });
    },
    [setStored],
  );

  return [order, setOrder] as const;
}
