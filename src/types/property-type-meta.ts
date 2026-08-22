import type {
  PropertyType,
  PropertyTypeMeta,
  PropertyConfig,
} from "./types.js";
import { OPERATORS_FOR_TYPE } from "./filter-types";

// ─── icons ────────────────────────────────────────────────────────────────────
// PropertyTypeMeta.icon and PROPERTY_TYPE_ICONS are now Material Symbols name
// strings (ligatures) rendered by DynamicIcon via the Material Symbols font —
// no bundled icon components.

export const PROPERTY_TYPE_ICONS: Record<PropertyType, string> = {
  title: "match_case",
  text: "notes",
  number: "tag",
  checkbox: "check_box",
  select: "expand_circle_down",
  multi_select: "list",
  status: "arrow_upload_progress",
  date: "calendar_today",
  person: "person",
  formula: "functions",
  relation: "sync_alt",
  rollup: "swap_vert",
  url: "link",
  phone: "call",
  email: "mail",
  created_time: "schedule",
  created_by: "person_add",
  edited_time: "schedule",
  edited_by: "edit",
};

// ─── default configs ──────────────────────────────────────────────────────────

const DEFAULT_CONFIGS: Record<PropertyType, PropertyConfig> = {
  title: { type: "title" },
  text: { type: "text" },
  number: { type: "number", format: "number" },
  checkbox: { type: "checkbox" },
  select: { type: "select", options: [] },
  multi_select: { type: "multi_select", options: [] },
  status: {
    type: "status",
    groups: [
      {
        id: "todo",
        label: "To do",
        items: [
          {
            id: "not-started",
            name: "Not started",
            color: "gray",
            isDefault: true,
          },
        ],
      },
      {
        id: "in_progress",
        label: "In progress",
        items: [
          {
            id: "in-progress",
            name: "In progress",
            color: "blue",
            isDefault: false,
          },
        ],
      },
      {
        id: "done",
        label: "Done",
        items: [{ id: "done", name: "Done", color: "green", isDefault: false }],
      },
    ],
  },
  date: { type: "date", format: "full", timeFormat: "12h", includeTime: false },
  person: {
    type: "person",
    limit: "no-limit",
    default: "no-default",
    notifications: "users-only",
  },
  formula: { type: "formula", expression: "" },
  relation: {
    type: "relation",
    targetSourceId: "",
    mirrorPropertyId: null,
    showOnTarget: false,
  },
  rollup: {
    type: "rollup",
    relationPropertyId: "",
    targetPropertyId: "",
    aggregation: "count",
  },
  url: { type: "url" },
  phone: { type: "phone" },
  email: { type: "email" },
  created_time: { type: "created_time" },
  created_by: { type: "created_by" },
  edited_time: { type: "edited_time" },
  edited_by: { type: "edited_by" },
};

// ─── meta list ────────────────────────────────────────────────────────────────

export const PROPERTY_TYPE_META: PropertyTypeMeta[] = [
  {
    type: "title",
    label: "Title",
    icon: "match_case",
    defaultConfig: DEFAULT_CONFIGS.title,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.title,
  },
  {
    type: "text",
    label: "Text",
    icon: "notes",
    defaultConfig: DEFAULT_CONFIGS.text,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.text,
  },
  {
    type: "number",
    label: "Number",
    icon: "tag",
    defaultConfig: DEFAULT_CONFIGS.number,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.number,
  },
  {
    type: "select",
    label: "Select",
    icon: "expand_circle_down",
    defaultConfig: DEFAULT_CONFIGS.select,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.select,
  },
  {
    type: "multi_select",
    label: "Multi-select",
    icon: "list",
    defaultConfig: DEFAULT_CONFIGS.multi_select,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.multi_select,
  },
  {
    type: "status",
    label: "Status",
    icon: "progress_activity",
    defaultConfig: DEFAULT_CONFIGS.status,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.status,
  },
  {
    type: "checkbox",
    label: "Checkbox",
    icon: "check_box",
    defaultConfig: DEFAULT_CONFIGS.checkbox,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.checkbox,
  },
  {
    type: "date",
    label: "Date",
    icon: "calendar_today",
    defaultConfig: DEFAULT_CONFIGS.date,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.date,
  },
  {
    type: "person",
    label: "Person",
    icon: "person",
    defaultConfig: DEFAULT_CONFIGS.person,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.person,
  },
  {
    type: "url",
    label: "URL",
    icon: "link",
    defaultConfig: DEFAULT_CONFIGS.url,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.url,
  },
  {
    type: "email",
    label: "Email",
    icon: "mail",
    defaultConfig: DEFAULT_CONFIGS.email,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.email,
  },
  {
    type: "phone",
    label: "Phone",
    icon: "call",
    defaultConfig: DEFAULT_CONFIGS.phone,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.phone,
  },
  {
    type: "formula",
    label: "Formula",
    icon: "functions",
    defaultConfig: DEFAULT_CONFIGS.formula,
    readOnly: true,
    filterOperators: OPERATORS_FOR_TYPE.formula,
  },
  {
    type: "relation",
    label: "Relation",
    icon: "sync_alt",
    defaultConfig: DEFAULT_CONFIGS.relation,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.relation,
  },
  {
    type: "rollup",
    label: "Rollup",
    icon: "swap_vert",
    defaultConfig: DEFAULT_CONFIGS.rollup,
    readOnly: true,
    filterOperators: OPERATORS_FOR_TYPE.rollup,
  },
  {
    type: "created_time",
    label: "Created time",
    icon: "schedule",
    defaultConfig: DEFAULT_CONFIGS.created_time,
    readOnly: true,
    filterOperators: OPERATORS_FOR_TYPE.created_time,
  },
  {
    type: "created_by",
    label: "Created by",
    icon: "person_add",
    defaultConfig: DEFAULT_CONFIGS.created_by,
    readOnly: true,
    filterOperators: OPERATORS_FOR_TYPE.created_by,
  },
  {
    type: "edited_time",
    label: "Last edited time",
    icon: "schedule",
    defaultConfig: DEFAULT_CONFIGS.edited_time,
    readOnly: true,
    filterOperators: OPERATORS_FOR_TYPE.edited_time,
  },
  {
    type: "edited_by",
    label: "Last edited by",
    icon: "edit",
    defaultConfig: DEFAULT_CONFIGS.edited_by,
    readOnly: true,
    filterOperators: OPERATORS_FOR_TYPE.edited_by,
  },
];

export const PROPERTY_TYPE_MAP = new Map(
  PROPERTY_TYPE_META.map((m) => [m.type, m]),
);

export function getTypeMeta(type: PropertyType): PropertyTypeMeta {
  const meta = PROPERTY_TYPE_MAP.get(type);
  if (!meta) throw new Error(`Unknown property type: ${type}`);
  return meta;
}
