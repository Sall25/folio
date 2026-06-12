import type { JSONContent } from "@tiptap/core";
import type { ID } from "src/components/tiptap-node/inline-database/types/types";
import type { Target } from "src/components/tiptap-ui/cover/types";

export type PageCategory =
  | "Recent"
  | "Favorites"
  | "Shared"
  | "Private"
  | "Template"
  | "Teamspaces"
  | "Page";

export type PageSettings = {
  width: "medium" | "full";
  text: "small" | "normal";
  locked: boolean;
};

export type PageCover = {
  iconName: string | null;
  coverImage: string | null;
  target: Target | null;
  color?: string;
  gradient?: string;
  positionY?: number;
};

export type Page = {
  id: number;
  title: string;
  settings: PageSettings;
  cover: PageCover;
  content: JSONContent;
  createdAt: string;
  updatedAt: string | null;
  parentId: number | null;
  children: Page[];
  category?: PageCategory;
  databaseId?: ID;
  recordId?: ID;
};

export type SimpleEditorContentProps = {
  activePage: Page;
  pages: Page[];
  updateCoverAsync: (cover: Page["cover"]) => Promise<void>;
  sidebarWidth: number;
  collapsed: boolean;
  updatePageAsync: (page: Page) => Promise<void>;
  addCoverAsync: (id: string) => Promise<void>;
  addPageAsync: ({
    title,
    parentId,
  }: {
    title: number;
    parentId: number | null;
  }) => Promise<Page>;
};

export type SaveState = "saved" | "unsaved" | "saving";

export type View = "home" | "page" | "resources";

// Workspace admin domain — People & Groups. Separate from the inline-database
// data-source engine: this models workspace membership, not database rows.

export type MemberRole = "owner" | "member" | "guest";

export interface Person {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: MemberRole;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  /** emoji or icon name */
  icon?: string;
  /** Single source of truth for membership. A person's groups are derived. */
  memberIds: string[];
  createdAt: string;
}

export interface InviteLink {
  enabled: boolean;
  url: string;
}

// ── Derived helpers (pure) ───────────────────────────────────────────────

/** People belonging to a group, in the group's member order. */
export function membersOf(group: Group, people: Person[]): Person[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  return group.memberIds
    .map((id) => byId.get(id))
    .filter((p): p is Person => !!p);
}

export function memberCount(group: Group): number {
  return group.memberIds.length;
}

/** Groups a given person is a member of (derived reverse side). */
export function groupsOfPerson(personId: string, groups: Group[]): Group[] {
  return groups.filter((g) => g.memberIds.includes(personId));
}

export function isGuest(p: Person): boolean {
  return p.role === "guest";
}

export function isMember(p: Person): boolean {
  return p.role === "owner" || p.role === "member";
}

// Teamspace domain — a container that groups people, attached groups, and
// pages within a workspace. Membership (direct members + attached groups)
// lives on the teamspace as the single source of truth, mirroring Groups.

export type TeamspaceAccess = "open" | "closed" | "private";
// open    — any workspace member can join/see it
// closed  — visible to all, join by request/invite
// private — only members/attached-group members can see it

export interface Teamspace {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  access: TeamspaceAccess;
  /** People directly in the teamspace. */
  memberIds: string[];
  /** Groups attached — their members gain access. */
  groupIds: string[];
  /** Teamspace owners/admins (subset of effective members). */
  ownerIds: string[];
  createdAt: string;
}

// ── Derived helpers (pure) ───────────────────────────────────────────────

/** Direct member People, in order. */
export function directMembers(ts: Teamspace, people: Person[]): Person[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  return ts.memberIds.map((id) => byId.get(id)).filter((p): p is Person => !!p);
}

/** Groups attached to the teamspace, in order. */
export function attachedGroups(ts: Teamspace, groups: Group[]): Group[] {
  const byId = new Map(groups.map((g) => [g.id, g]));
  return ts.groupIds.map((id) => byId.get(id)).filter((g): g is Group => !!g);
}

/**
 * Everyone with access: direct members UNION members of every attached group.
 * Deduped. This is the "effective membership" of a teamspace.
 */
export function effectiveMemberIds(ts: Teamspace, groups: Group[]): string[] {
  const set = new Set<string>(ts.memberIds);
  const byId = new Map(groups.map((g) => [g.id, g]));
  for (const gid of ts.groupIds) {
    const g = byId.get(gid);
    if (g) for (const pid of g.memberIds) set.add(pid);
  }
  return [...set];
}

export function effectiveMemberCount(ts: Teamspace, groups: Group[]): number {
  return effectiveMemberIds(ts, groups).length;
}

/** Teamspaces a given group is attached to (reverse of groupIds). */
export function teamspacesOfGroup(
  groupId: string,
  teamspaces: Teamspace[],
): Teamspace[] {
  return teamspaces.filter((t) => t.groupIds.includes(groupId));
}
