import type { FilterOperator, FilterGroup } from "./filter-types";
import type { JSONContent } from "@tiptap/core";
import type { Target } from "src/components/tiptap-ui/cover/types";

export type ID = string;

export interface SelectOption {
  id: string;
  label: string;
  color: string;
  isDefault?: boolean;
}

export type PageView = "Full" | "Center" | "Peek";

// ─────────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────────
export type StatusColor =
  | "gray"
  | "blue"
  | "green"
  | "orange"
  | "red"
  | "purple"
  | "yellow";

export interface StatusItem {
  id: string;
  name: string;
  color: StatusColor;
  isDefault?: boolean;
}

export interface StatusGroup {
  id: string;
  label: string;
  items: StatusItem[];
}

export interface StatusPropertyProps {
  groups?: StatusGroup[];
  onChange?: (groups: StatusGroup[]) => void;
}

export type SavedView = DatabaseView;

export interface RowTemplate {
  id: ID;
  name: string;
  icon?: string | null;
  /** pre-filled cells, keyed by propertyId (partial — unset cells use defaults) */
  values: Record<ID, CellValue>;
  /** optional seed content for the row-page body */
  content?: JSONContent | null;
  createdAt: CreatedAt;
  /** the editable template page (Model B) — open in center to customize */
  pageId?: ID;
}

export type DataSourceRecord = Page["values"];

// add to DataSource:
//   rowTemplates: RowTemplate[];
export interface DataSource {
  id: ID;
  /** the schema — moved off the database node */
  properties: DatabaseProperty[];
  /** the rows */
  createdAt: CreatedAt;
  updatedAt: UpdatedAt;
  pageId: ID;
  name: string;
  savedViews: SavedView[];
  views: DatabaseView[];
  rowTemplates: RowTemplate[];
  /** which template is the default for new rows (the check mark) */
  defaultTemplateId?: ID | null;
}

export type PropertyType =
  | "title"
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "status"
  | "checkbox"
  | "date"
  | "person"
  | "formula"
  | "relation"
  | "rollup"
  | "created_time"
  | "created_by"
  | "edited_time"
  | "url"
  | "email"
  | "phone"
  | "edited_by";

export type ViewType =
  | "table"
  | "board"
  | "list"
  | "gallery"
  | "calendar"
  | "timeline";

// ─────────────────────────────────────────────────────────────────────────────
// Property config primitives
// ─────────────────────────────────────────────────────────────────────────────
export type PersonLimit = "no-limit" | "single";

export type PersonDefault = "no-default" | "me";

export type PersonNotifications = "users-only" | "everyone";

export interface PersonPropertyValue {
  limit: PersonLimit;
  default: PersonDefault;
  notifications: PersonNotifications;
}

export type PersonPropertyPanel = "limit" | "default" | "notifications";

export interface PersonPropertyProps {
  value?: PersonPropertyValue;
  onNavigate?: (panel: PersonPropertyPanel) => void;
}

export type NumberFormat =
  | "number"
  | "number_with_commas"
  | "percent"
  | "dollar"
  | "euro"
  | "pound"
  | "yen"
  | "ruble"
  | "rupee"
  | "won"
  | "yuan";

export type DateFormat =
  | "full" // January 4, 2026
  | "short" // Jan 4, 2026
  | "relative" // 2 days ago
  | "iso"; // 2026-01-04

export type TimeFormat = "12h" | "24h";

export type AggregationFunction =
  | "count"
  | "count_values"
  | "count_unique"
  | "count_empty"
  | "count_not_empty"
  | "percent_empty"
  | "percent_not_empty"
  | "sum"
  | "average"
  | "median"
  | "min"
  | "max"
  | "range"
  | "earliest_date"
  | "latest_date"
  | "date_range"
  | "checked"
  | "unchecked"
  | "percent_checked"
  | "percent_unchecked"
  | "show_original";

// ─────────────────────────────────────────────────────────────────────────────
// Property configs — discriminated union, one per type
// ─────────────────────────────────────────────────────────────────────────────
export type DecimalPlaces = "default" | 0 | 1 | 2 | 3 | 4 | 5;
export type NumberShowAs = "number" | "bar" | "ring";
export type DateNotifications =
  | "none"
  | "same_day"
  | "1_day_before"
  | "2_days_before";

export type PropertyConfig =
  | { type: "title"; showPageIcon?: boolean }
  | { type: "text" }
  | { type: "checkbox" }
  | { type: "created_time" }
  | { type: "created_by" }
  | { type: "edited_time" }
  | { type: "edited_by" }
  | {
      type: "number";
      format: NumberFormat;
      prefix?: string;
      suffix?: string;
      decimalPlaces?: DecimalPlaces;
      showAs?: NumberShowAs;
    }
  | { type: "select"; options: SelectOption[] }
  | { type: "multi_select"; options: SelectOption[] }
  | { type: "status"; groups: StatusGroup[] }
  | {
      type: "date";
      format: DateFormat;
      timeFormat: TimeFormat;
      includeTime: boolean;
      notifications?: DateNotifications;
    }
  | {
      type: "person";
      limit: PersonLimit;
      default: PersonDefault;
      notifications: PersonNotifications;
    }
  | { type: "formula"; expression: string }
  | {
      type: "relation";
      showOnTarget: boolean;
      targetSourceId: ID;
      mirrorPropertyId: ID | null;
    }
  | {
      type: "rollup";
      relationPropertyId: ID; // a relation property on this same source
      targetPropertyId: ID; // a property on the related source
      aggregation: AggregationFunction;
    }
  | { type: "url"; showFullUrl?: boolean }
  | { type: "phone" }
  | { type: "email" };

// Extract helper — used throughout cell nodes and views
export type ConfigOf<T extends PropertyType> = Extract<
  PropertyConfig,
  { type: T }
>;

// ─────────────────────────────────────────────────────────────────────────────
// Property definition
// ─────────────────────────────────────────────────────────────────────────────

export interface DatabaseProperty {
  id: ID;
  name: string;
  config: PropertyConfig;
  /** Display width in pixels — used by table view */
  width?: number;
  wrap?: boolean;
  icon?: string;
  iconColor?: string;
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cell value types — one per property type, no more union soup
// ─────────────────────────────────────────────────────────────────────────────

/** One person reference */
export interface PersonValue {
  id: ID;
  name: string;
  avatarUrl?: string;
}

/** One relation link */
export interface RelationValue {
  pageId: ID; // the linked row-page — was recordId, renamed per the collapse
  databaseId: ID; // which database that row belongs to (denormalized convenience)
  title?: string; // cached for display — refreshed on read
}

/**
 * Maps each PropertyType to its concrete value type.
 * Use CellValue<T> anywhere you need a type-safe cell value.
 */
export type CellValueMap = {
  title: string; // plain text — content is the editable node
  text: string; // plain text — content is the editable node
  number: number | null;
  select: SelectOption;
  multi_select: SelectOption[]; // SelectOption.id[]
  status: ID | null; // StatusItem.id
  checkbox: boolean;
  date: string | { start: string; end?: string } | null; // ISO string
  person: PersonValue[];
  formula: string | number | boolean | null; // computed, read-only
  relation: RelationValue[];
  rollup: string | number | null; // computed, read-only
  created_time: CreatedAt | null; // read-only
  created_by: ID | null; // read-only
  edited_time: UpdatedAt | null; // read-only
  edited_by: ID | null; // read-only
  url: string;
  email: string;
  phone: string;
};

export type CellValue<T extends PropertyType = PropertyType> = CellValueMap[T];

// ─────────────────────────────────────────────────────────────────────────────
// Cell node attrs — typed per cell node, used in NodeViewRendererProps
// ─────────────────────────────────────────────────────────────────────────────
export interface BaseCellAttrs {
  propertyId: ID;
  pageId: ID | null;
}

export interface TitleCellAttrs extends BaseCellAttrs {
  parentId: ID | null;
}

export interface ValueCellAttrs<T extends PropertyType> extends BaseCellAttrs {
  value: CellValue<T>;
}

// Concrete attrs per node — import these in node views
export type SelectCellAttrs = ValueCellAttrs<"select">;
export type MultiSelectCellAttrs = ValueCellAttrs<"multi_select">;
export type StatusCellAttrs = ValueCellAttrs<"status">;
export type NumberCellAttrs = ValueCellAttrs<"number">;
export type CheckboxCellAttrs = ValueCellAttrs<"checkbox">;
export type DateCellAttrs = ValueCellAttrs<"date">;
export type PersonCellAttrs = ValueCellAttrs<"person">;
export type FormulaCellAttrs = ValueCellAttrs<"formula">;
export type RelationCellAttrs = ValueCellAttrs<"relation">;
export type RollupCellAttrs = ValueCellAttrs<"rollup">;
export type TextCellAttrs = ValueCellAttrs<"text">; // content-based, no value attr

export interface DatabaseAttrs {
  id: ID;
  title: string;
  /** Ordered list of property definitions — the schema */
  properties: DatabaseProperty[];
  /** All view definitions — display config */
  views: DatabaseView[];
  /** The currently active view */
  activeViewId: ID;
  /** Icon — emoji or URL */
  icon?: string;
  /** Cover image URL */
  cover?: string;

  templateId?: ID;

  hideTitle?: boolean;

  sourceId?: ID;

  pageId?: ID;

  locked?: boolean;

  isLinked?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sorting
// ─────────────────────────────────────────────────────────────────────────────

export interface SortRule {
  id: ID;
  propertyId: ID;
  direction: "asc" | "desc";
}

// ─────────────────────────────────────────────────────────────────────────────
// Calculation types
// ─────────────────────────────────────────────────────────────────────────────

export type CalcType =
  | "none"
  | "count_all"
  | "count_values"
  | "count_unique"
  | "count_empty"
  | "count_not_empty"
  | "percent_empty"
  | "percent_not_empty"
  | "earliest_date"
  | "latest_date"
  | "date_range"
  | "sum"
  | "average"
  | "median"
  | "min"
  | "max"
  | "range";

// ─────────────────────────────────────────────────────────────────────────────
// Views
// ─────────────────────────────────────────────────────────────────────────────

export type OpenPageIn = "Full" | "Side" | "Center";

interface BaseView {
  id: ID;
  name: string;
  filters: FilterGroup[];
  sorts: SortRule[];
  hiddenProperties: ID[];
  /** Selected calculation per property (footer/summary row). Keyed by
   *  propertyId; absent or "none" means no calculation. */
  calculations?: Record<ID, CalcType>;
  openPageIn?: OpenPageIn;
  iconName?: string;
  target?: Target;
  color?: string;
}

export interface TableView extends BaseView {
  type: "table";
  propertyOrder: ID[];
  frozenPropertyId?: ID | null;
  unwrappedProperties?: ID[];
  groupByPropertyId?: ID | null;
  collapsedGroups?: string[]; // group value keys that are collapsed
  showEmptyGroups?: boolean;
}

export interface ListView extends BaseView {
  type: "list";
  visibleProperties: ID[];
  groupByPropertyId?: ID | null;
  collapsedGroups?: string[];
  showEmptyGroups?: boolean;
}

export interface BoardView extends BaseView {
  type: "board";
  groupByPropertyId: ID;
  showEmptyGroups: boolean;
  cardSize: "small" | "medium" | "large";
  coverFit: "cover" | "contain";
  cardPreview?: "none" | "cover" | "content";
  /** Record ids in user-arranged order. Applied after `sorts`; ids not present
   *  fall through in sorted order. Flat across columns — per-column order is
   *  derived by filtering this to the column's records. */
  manualOrder?: ID[];
  /** Column/group ids hidden from the board (the "No {group}" column uses the
   *  NONE_COLUMN_ID sentinel). Hidden groups are filtered out of the rendered
   *  columns and surfaced in Edit groups for un-hiding. */
  hiddenGroups?: ID[];
}

export interface GalleryView extends BaseView {
  type: "gallery";
  coverPropertyId?: ID;
  cardSize: "small" | "medium" | "large";
  coverFit: "cover" | "contain";
  cardPreview?: "none" | "cover" | "content";
  /** Record ids in user-arranged order. Applied after `sorts`; ids not present
   *  fall through in sorted order. Flat across columns — per-column order is
   *  derived by filtering this to the column's records. */
  manualOrder?: ID[];
}

export interface CalendarView extends BaseView {
  type: "calendar";
  datePropertyId: string;
  manualOrder?: ID[];
}

export interface TimelineView extends BaseView {
  type: "timeline";
  startDatePropertyId: ID;
  endDatePropertyId: ID;
  timeframe: "day" | "week" | "month" | "quarter" | "year";
  showTable: boolean;
}
export type DatabaseView =
  | TableView
  | BoardView
  | ListView
  | GalleryView
  | CalendarView
  | TimelineView;

// ─────────────────────────────────────────────────────────────────────────────
// UI state — ephemeral, never stored in the doc
// ─────────────────────────────────────────────────────────────────────────────

export interface CellAddress {
  propertyId: ID;
  pageId: ID;
}

export interface DatabaseUIState {
  editingCell: CellAddress | null;
  openRecordId: ID | null;
  openPropertyId: ID | null;
  searchQuery: string;
  panelStack: PanelView[];
  viewOptionsOpen: boolean;
}
export type PanelView =
  | { type: "main" }
  | { type: "properties" }
  | { type: "filter" }
  | { type: "sort" }
  | { type: "layout" }
  | { type: "open-pages-in" }
  | { type: "group" }
  | { type: "sub-items" };

// ─────────────────────────────────────────────────────────────────────────────
// Property registry
// ─────────────────────────────────────────────────────────────────────────────

export interface PropertyTypeMeta {
  type: PropertyType;
  label: string;
  icon: string;
  defaultConfig: PropertyConfig;
  readOnly: boolean;
  filterOperators: FilterOperator[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Type guards
// ─────────────────────────────────────────────────────────────────────────────

export function isTableView(view: DatabaseView): view is TableView {
  return view.type === "table";
}

export function isBoardView(view: DatabaseView): view is BoardView {
  return view.type === "board";
}

export function isListView(view: DatabaseView): view is ListView {
  return view.type === "list";
}

export function isGalleryView(view: DatabaseView): view is GalleryView {
  return view.type === "gallery";
}

export function hasOptions(
  config: PropertyConfig,
): config is Extract<PropertyConfig, { options: SelectOption[] }> {
  return "options" in config;
}

export function isReadOnlyProperty(type: PropertyType): boolean {
  return (
    type === "formula" ||
    type === "rollup" ||
    type === "created_time" ||
    type === "created_by" ||
    type === "edited_time" ||
    type === "edited_by"
  );
}

export function isGroupableProperty(type: PropertyType): boolean {
  // Group by any property except ones where every row is its own group
  // (title = the row name) or that have no stable value to bucket by.
  return type !== "title";
}

export function isContentBasedCell(
  type: PropertyType,
): type is "title" | "text" {
  return type === "title" || type === "text";
}

// -------------- Page --------------------------------------------------------------

// ── Shared timestamp aliases — ONE representation, everywhere ──────────────
// Epoch milliseconds (matches DataSource). updatedAt null = never updated.
export type CreatedAt = number;
export type UpdatedAt = number | null;

// ── Page ────────────────────────────────────────────────────────────────────

// Stored categories only. "Recent" is a derived view (sort by updatedAt),
// not a stored category — it lives in the sidebar code, not on the page.
export type PageCategory =
  | "Recent"
  | "Favorites"
  | "Shared"
  | "Private"
  | "Template"
  | "Teamspaces";

export type PageSettings = {
  width: "medium" | "full";
  text: "small" | "normal";
  locked: boolean;
};

export type PageCover = {
  iconName: string | null;
  coverImage: string | null;
  target: Target | null;
  color: string | null;
  gradient: string | null;
  positionY: number | null;
};

/**
 * The STORED page. Single source of truth for hierarchy is parentId —
 * there is no children array; trees are derived (see PageTreeNode).
 *
 * Post-collapse: a database row IS a page. A row-page has sourceId set and
 * carries its cell values; a normal page has both null.
 */
export type Page = {
  id: ID;
  title: string;
  settings: PageSettings;
  cover: PageCover;
  content: JSONContent;
  createdAt: CreatedAt;
  updatedAt: UpdatedAt;
  parentId: ID | null;
  /** The workspace this page belongs to. Explicit (not derived from the
   *  teamspace ancestor) so page queries can scope by workspace without a
   *  parentId walk. */
  workspaceId: ID;
  teamspaceId: ID | null;
  category: PageCategory;
  /** Database membership — null when this page is not a database row. */
  sourceId: ID | null;
  /** Cell values keyed by propertyId — null when not a database row. */
  values: Record<ID, CellValue> | null;

  generalAccess: GeneralAccess;
  generalAccessRole: PageRole;

  ownerId: ID | null;
  deletedAt?: number | null;
};

/** Derived tree shape — built at read time from parentId, never stored. */
export type PageTreeNode = {
  page: Page;
  children: PageTreeNode[];
};

export type SaveState = "saved" | "unsaved" | "saving";

export type View =
  | "home"
  | "page"
  | "resources"
  | "library"
  | "inbox"
  | "trash";

export type SimpleEditorContentProps = {
  activePage: Page;
  pages: Page[];
  updateCoverAsync: (cover: Page["cover"]) => Promise<void>;
  sidebarWidth: number;
  collapsed: boolean;
  updatePageAsync: (page: Page) => Promise<void>;
  addCoverAsync: (id: ID) => Promise<void>;
  addPageAsync: (args: {
    title: string; // was `number` — typo fixed
    parentId: ID | null;
  }) => Promise<Page>;
};

// ── Workspace admin domain — People & Groups ────────────────────────────────
// Separate from the inline-database engine: workspace membership, not rows.

export type MemberRole = "owner" | "member" | "guest";

export interface Person {
  id: ID;
  /** The workspace this person belongs to. */
  workspaceId: ID;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: MemberRole;
  createdAt: CreatedAt;
  notificationSettings?: Partial<Record<NotificationType, boolean>>;
}

export interface Group {
  id: ID;
  /** Groups belong to the workspace, not a teamspace — they're referenced BY
   *  teamspaces (via groupIds) but owned here, so one group can grant access
   *  to several teamspaces. */
  workspaceId: ID;
  name: string;
  /** emoji or icon name */
  icon: string | null;
  /** Single source of truth for membership. A person's groups are derived. */
  memberIds: ID[];
  createdAt: CreatedAt;
}

export interface InviteLink {
  enabled: boolean;
  url: string;
}

// ── Workspace domain ─────────────────────────────────────────────────────────
// The top-level container. People, groups, teamspaces and pages each belong to
// exactly one workspace (via workspaceId). Folio ships single-workspace, but the
// model is multi-workspace-ready so the eventual switch is additive — no entity
// needs restructuring, only queries need scoping.

export type Theme = "light" | "dark" | "system";

export type WorkspaceLanguage = "en" | "fr";

// Where a newly-invited person lands the first time they enter the workspace.
export type InviteLanding = "welcome" | "top-page" | "library";

// Where a person lands when switching INTO this workspace from another.
//   last-visited — the page they were last on in this workspace
//   top-page     — the topmost page in the sidebar
//   library      — the Library view
export type SwitchLanding = "last-visited" | "top-page" | "library";

// Workspace-wide sidebar defaults. Individuals may override locally; this is
// the shipped default for new members.
export interface WorkspaceSidebarSettings {
  /** Sections collapsed by default. */
  defaultCollapsedSections: PageCategory[];
  /** Whether the Showcase section is shown at all. */
  showShowcase: boolean;
}

export interface WorkspaceSettings {
  /** Workspace DEFAULT theme. Individual members may override for themselves;
   *  this is the fallback, not a hard workspace-wide lock. */
  defaultTheme: Theme;
  language: WorkspaceLanguage;

  /** Landing rules — see InviteLanding / SwitchLanding. */
  landingOnInvite: InviteLanding;
  landingOnSwitch: SwitchLanding;

  sidebar: WorkspaceSidebarSettings;

  // People-directory surface (Notion's three People-settings toggles).
  peopleDirectoryEnabled: boolean;
  showRecentActivityOnProfiles: boolean;
  hoverCardsEnabled: boolean;

  /** Invite link — folded in from the former standalone settings singleton. */
  inviteLink: InviteLink;
}

export interface Workspace {
  id: ID;
  name: string;
  /** emoji or icon name — same convention as Group.icon. */
  icon: string | null;
  settings: WorkspaceSettings;
  createdAt: CreatedAt;
  updatedAt: UpdatedAt;
  iconColor: string | null;
  plan: WorkspacePlan;
  ownerId: ID;
  iconTarget: string | null; // "Emoji" | "Icons" | null
}

export type WorkspacePlan = "free" | "pro";

export interface PlanLimits {
  plan: WorkspacePlan;
  maxMembers: number | null; // null = unlimited
  maxTeamspaces: number | null;
  maxWorkspaces: number | null;
  versionHistory: boolean;
}

/** Defaults for a freshly created workspace — matches Notion's on-state. */
export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  defaultTheme: "system",
  language: "en",
  landingOnInvite: "welcome",
  landingOnSwitch: "last-visited",
  sidebar: {
    defaultCollapsedSections: [],
    showShowcase: true,
  },
  peopleDirectoryEnabled: true,
  showRecentActivityOnProfiles: true,
  hoverCardsEnabled: true,
  inviteLink: { enabled: false, url: "" },
};

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
export function groupsOfPerson(personId: ID, groups: Group[]): Group[] {
  return groups.filter((g) => g.memberIds.includes(personId));
}

export function isGuest(p: Person): boolean {
  return p.role === "guest";
}

export function isMember(p: Person): boolean {
  return p.role === "owner" || p.role === "member";
}

// ── Teamspace domain ─────────────────────────────────────────────────────────

export type TeamspaceAccess = "open" | "closed" | "private";
// open    — any workspace member can join/see it
// closed  — visible to all, join by request/invite
// private — only members/attached-group members can see it
export interface Teamspace {
  /**
   * Shared id: this IS the teamspace page's id. That identity is the link
   * between record and page — there is no separate pageId. Display fields
   * (name, icon) live on the page (title, cover.iconName), not here, to avoid
   * two sources of truth that can drift on rename.
   */
  id: ID;
  /** The workspace this teamspace belongs to. */
  workspaceId: ID;
  description: string | null;
  access: TeamspaceAccess;
  /** People directly in the teamspace. */
  memberIds: ID[];
  /** Groups attached — their members gain access. */
  groupIds: ID[];
  /** Teamspace owners/admins (subset of effective members). */
  ownerIds: ID[];
  createdAt: CreatedAt;
  pinnedPageIds?: ID[];
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
export function effectiveMemberIds(ts: Teamspace, groups: Group[]): ID[] {
  const set = new Set<ID>(ts.memberIds);
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
  groupId: ID,
  teamspaces: Teamspace[],
): Teamspace[] {
  return teamspaces.filter((t) => t.groupIds.includes(groupId));
}

export type Version = {
  id: ID;
  pageId: ID;
  title: string;
  content: Page["content"] | null;
  createdAt: CreatedAt;
  name: string | null;
};

export type Reactions = Record<string, ID[]>;

export type Comment = {
  id: ID;
  threadId: ID;
  personId: ID;
  body: string;
  createdAt: CreatedAt;
  updatedAt: UpdatedAt;
  reactions?: Reactions;
};

export type ThreadStatus =
  | "active"
  | "resolved"
  | "drafted"
  | "open"
  | "deleted";

export type Thread = {
  id: ID;
  anchor: {
    from: number;
    to: number;
  } | null;
  status: ThreadStatus;
  pageId: ID;
};

export type MeasuredThread = {
  id: string;
  from: number;
  to: number;
  anchorTop: number;
  height: number;
};

export type PositionedThread = MeasuredThread & { resolvedTop: number };

export type NotificationType =
  | "user-mention"
  | "date-due"
  | "date-overdue"
  | "backlink"
  | "comment-mention"; // ← new: a mention inside a comment

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  sourcePageId?: string | number;
  sourcePageTitle?: string;
  mentionLabel?: string;
  mentionId?: string;
  targetNodeId?: string;
}

export interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  // addNotification now accepts an optional recipientId (defaults to the
  // current user) and dedupKey (server-side idempotency).
  addNotification: (
    payload: Omit<Notification, "id" | "timestamp" | "read"> & {
      recipientId?: string;
      dedupKey?: string;
    },
  ) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  hasNotified: (key: string) => boolean;
  registerNotified: (key: string) => void;
}

// ── Add to src/types.ts ──────────────────────────────────────────────────────
// Per-page permissions (Notion model). Roles are ordered view < comment < edit
// < full; the effective role is the highest reaching a person across direct
// grants, group grants, inherited ancestor grants, and general access.

export type PageRole = "view" | "comment" | "edit" | "full";

// How people WITHOUT an explicit grant reach a page.
//   private   — only explicitly granted people/groups (and ancestors' grants)
//   teamspace — everyone in the page's teamspace (the default)
//   workspace — every workspace member
//   public    — anyone with the link
export type GeneralAccess = "private" | "teamspace" | "workspace" | "public";

export type PageAccessSubject = "person" | "group";

export interface PageAccessGrant {
  id: ID;
  pageId: ID;
  subjectType: PageAccessSubject;
  subjectId: ID; // Person.id or Group.id
  role: PageRole;
  createdAt: CreatedAt;
}

// Ordered for max-role comparisons on the client (mirrors the SQL enum order).
export const PAGE_ROLE_ORDER: Record<PageRole, number> = {
  view: 0,
  comment: 1,
  edit: 2,
  full: 3,
};

export const higherRole = (a: PageRole, b: PageRole): PageRole =>
  PAGE_ROLE_ORDER[a] >= PAGE_ROLE_ORDER[b] ? a : b;
