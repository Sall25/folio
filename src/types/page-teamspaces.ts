// page-teamspaces.ts
// Derivation layer for page ↔ teamspace membership. teamspaceId is authoritative
// only on top-level pages (parentId === null); everything else is derived here so
// there's no denormalized invariant to keep in sync on moves.
//
// Can be folded into types.ts (next to directMembers/effectiveMemberIds) if you
// prefer one domain file — kept separate to avoid re-pasting the large types.ts.

import type { Page, Teamspace, Group, ID } from "./types";
import { effectiveMemberIds } from "./types";

/** id → page map, for ancestor walks. Build once per render, pass into helpers. */
export function pagesById(pages: Page[]): Map<ID, Page> {
  return new Map(pages.map((p) => [p.id, p]));
}

/**
 * Walk parentId up to the top-level ancestor (parentId === null).
 * Orphan (missing parent) or a cycle returns the last reachable page as root.
 */
export function rootOf(page: Page, byId: Map<ID, Page>): Page {
  let cur = page;
  const seen = new Set<ID>();
  while (cur.parentId !== null) {
    if (seen.has(cur.id)) break; // cycle guard
    seen.add(cur.id);
    const parent = byId.get(cur.parentId);
    if (!parent) break; // orphan: treat current as the root
    cur = parent;
  }
  return cur;
}

/**
 * The teamspace a page belongs to, via its root ancestor.
 * null = private/personal. This is the ONLY sanctioned way to read a nested
 * page's teamspace — never trust a child's own teamspaceId field.
 */
export function teamspaceIdOfPage(page: Page, byId: Map<ID, Page>): ID | null {
  return rootOf(page, byId).teamspaceId ?? null;
}

/**
 * Top-level pages grouped by teamspaceId. The null key is the private/personal
 * bucket. Templates are excluded (they live in the gallery, not the sidebar).
 */
export function groupRootsByTeamspace(pages: Page[]): Map<ID | null, Page[]> {
  const out = new Map<ID | null, Page[]>();
  for (const p of pages) {
    if (p.parentId !== null) continue; // roots only
    if (p.category === "Template") continue;
    const key = p.teamspaceId ?? null;
    const arr = out.get(key) ?? [];
    arr.push(p);
    out.set(key, arr);
  }
  return out;
}

/** Root pages belonging to one teamspace (its sidebar section contents, pre-subtree). */
export function teamspaceRoots(teamspaceId: ID, pages: Page[]): Page[] {
  return pages.filter(
    (p) => p.parentId === null && (p.teamspaceId ?? null) === teamspaceId,
  );
}

/**
 * Is this person an effective member of the teamspace (direct OR via an attached
 * group)? This is the predicate for "show in MY sidebar", regardless of access.
 */
export function isTeamspaceMember(
  ts: Teamspace,
  personId: ID,
  groups: Group[],
): boolean {
  return effectiveMemberIds(ts, groups).includes(personId);
}

/**
 * Can this person DISCOVER the teamspace (e.g. a "Teamspaces you can join" list)?
 * open/closed are discoverable by any member; private only to effective members.
 * Distinct from isTeamspaceMember: discoverability is for the browse/join surface,
 * membership is for the main sidebar.
 */
export function canDiscoverTeamspace(
  ts: Teamspace,
  personId: ID,
  groups: Group[],
): boolean {
  return ts.access !== "private" || isTeamspaceMember(ts, personId, groups);
}
