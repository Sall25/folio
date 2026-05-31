import type { FilterOperator, FilterGroup } from "./filter-types";
import type { SelectOption } from "../../database-node/select-property-node/select-property-node";

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

export type ID = string;

export interface DataSourceRecord {
  id: ID;
  /** cell values keyed by propertyId */
  values: Record<ID, unknown>;
  /** if this row is also a page */
  pageId?: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface DataSource {
  id: ID;
  /** the schema — moved off the database node */
  properties: DatabaseProperty[];
  /** the rows */
  records: DataSourceRecord[];
  createdAt: string;
  updatedAt: string | null;
  pageId?: number;
  name?: string;
}

export type { SelectOption } from "../../database-node/select-property-node/select-property-node";

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
  | { type: "title" }
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
      targetDatabaseId: ID;
      syncedPropertyId?: ID;
      showOnTarget: boolean;
    }
  | {
      type: "rollup";
      relationPropertyId: ID;
      targetPropertyId: ID;
      aggregation: AggregationFunction;
    }
  | { type: "url" }
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
  recordId: ID;
  databaseId: ID;
  /** Cached title for display — refreshed on read */
  title?: string;
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
  date: string | null; // ISO string
  person: PersonValue[];
  formula: string | number | boolean | null; // computed, read-only
  relation: RelationValue[];
  rollup: string | number | null; // computed, read-only
  created_time: string | null; // ISO string, read-only
  created_by: ID | null; // read-only
  edited_time: string | null; // ISO string, read-only
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
  pageId: number | null;
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

// ─────────────────────────────────────────────────────────────────────────────
// Record node attrs — the ProseMirror node, no values (those live in cells)
// ─────────────────────────────────────────────────────────────────────────────

export interface DatabaseRecordAttrs {
  id: ID;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  createdBy?: ID;
  editedBy?: ID;
}

// ─────────────────────────────────────────────────────────────────────────────
// Database node attrs — schema + views only, no records
// ─────────────────────────────────────────────────────────────────────────────

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

  templateId?: number;

  hideTitle?: boolean;

  sourceId?: ID;
  pageId?: number;
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
// Views
// ─────────────────────────────────────────────────────────────────────────────

interface BaseView {
  id: ID;
  name: string;
  filters: FilterGroup[];
  sorts: SortRule[];
  hiddenProperties: ID[];
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
  cardPreview?: "none" | "cover" | "content";
}

export interface GalleryView extends BaseView {
  type: "gallery";
  coverPropertyId?: ID;
  cardSize: "small" | "medium" | "large";
  coverFit: "cover" | "contain";
}

export interface CalendarView extends BaseView {
  type: "calendar";
  datePropertyId: string;
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
  recordId: ID;
  propertyId: ID;
}

export interface DatabaseUIState {
  editingCell: CellAddress | null;
  openRecordId: ID | null;
  openPropertyId: ID | null;
  searchQuery: string;
  panelStack: PanelView[];
}

export type PanelView =
  | { type: "main" }
  | { type: "status-editor" }
  | { type: "formula-editor" }
  | { type: "person-limit" }
  | { type: "person-default" }
  | { type: "person-notifications" }
  | { type: "relation-target" }
  | { type: "rollup-relation" }
  | { type: "rollup-property" }
  | { type: "rollup-aggregation" };

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

export type DatabaseRecord = Record<ID, CellValue>;
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
  return (
    type === "select" ||
    type === "status" ||
    type === "multi_select" ||
    type === "checkbox" ||
    type === "person"
  );
}

export function isContentBasedCell(
  type: PropertyType,
): type is "title" | "text" {
  return type === "title" || type === "text";
}
