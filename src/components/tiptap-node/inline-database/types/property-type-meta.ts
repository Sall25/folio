import {
  Type,
  User,
  Calendar,
  Hash,
  CheckSquare,
  UserCheck,
  Clock,
  Edit3,
  CaseSensitive,
  CircleChevronDown,
  Loader,
  ArrowUpDown,
  ArrowLeftRight,
  Link,
  Phone,
  Mail,
  Sigma,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PropertyType, PropertyTypeMeta, PropertyConfig } from "./types";
import { OPERATORS_FOR_TYPE } from "./filter-types";

// ─── icons ────────────────────────────────────────────────────────────────────
// PropertyTypeMeta.icon is a lucide icon name string (e.g. "Hash").
// PROPERTY_TYPE_ICONS maps PropertyType → actual LucideIcon component for rendering.

export const PROPERTY_TYPE_ICONS: Record<PropertyType, LucideIcon> = {
  title: CaseSensitive,
  text: Type,
  number: Hash,
  checkbox: CheckSquare,
  select: CircleChevronDown,
  multi_select: CircleChevronDown,
  status: Loader,
  date: Calendar,
  person: User,
  formula: Sigma,
  relation: ArrowLeftRight,
  rollup: ArrowUpDown,
  url: Link,
  phone: Phone,
  email: Mail,
  created_time: Clock,
  created_by: UserCheck,
  edited_time: Clock,
  edited_by: Edit3,
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
  relation: { type: "relation", targetDatabaseId: "", showOnTarget: false },
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
    icon: "CaseSensitive",
    defaultConfig: DEFAULT_CONFIGS.title,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.title,
  },
  {
    type: "text",
    label: "Text",
    icon: "Type",
    defaultConfig: DEFAULT_CONFIGS.text,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.text,
  },
  {
    type: "number",
    label: "Number",
    icon: "Hash",
    defaultConfig: DEFAULT_CONFIGS.number,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.number,
  },
  {
    type: "select",
    label: "Select",
    icon: "CircleChevronDown",
    defaultConfig: DEFAULT_CONFIGS.select,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.select,
  },
  {
    type: "multi_select",
    label: "Multi-select",
    icon: "CircleChevronDown",
    defaultConfig: DEFAULT_CONFIGS.multi_select,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.multi_select,
  },
  {
    type: "status",
    label: "Status",
    icon: "Loader",
    defaultConfig: DEFAULT_CONFIGS.status,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.status,
  },
  {
    type: "checkbox",
    label: "Checkbox",
    icon: "CheckSquare",
    defaultConfig: DEFAULT_CONFIGS.checkbox,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.checkbox,
  },
  {
    type: "date",
    label: "Date",
    icon: "Calendar",
    defaultConfig: DEFAULT_CONFIGS.date,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.date,
  },
  {
    type: "person",
    label: "Person",
    icon: "User",
    defaultConfig: DEFAULT_CONFIGS.person,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.person,
  },
  {
    type: "url",
    label: "URL",
    icon: "Link",
    defaultConfig: DEFAULT_CONFIGS.url,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.url,
  },
  {
    type: "email",
    label: "Email",
    icon: "Mail",
    defaultConfig: DEFAULT_CONFIGS.email,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.email,
  },
  {
    type: "phone",
    label: "Phone",
    icon: "Phone",
    defaultConfig: DEFAULT_CONFIGS.phone,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.phone,
  },
  {
    type: "formula",
    label: "Formula",
    icon: "Sigma",
    defaultConfig: DEFAULT_CONFIGS.formula,
    readOnly: true,
    filterOperators: OPERATORS_FOR_TYPE.formula,
  },
  {
    type: "relation",
    label: "Relation",
    icon: "ArrowLeftRight",
    defaultConfig: DEFAULT_CONFIGS.relation,
    readOnly: false,
    filterOperators: OPERATORS_FOR_TYPE.relation,
  },
  {
    type: "rollup",
    label: "Rollup",
    icon: "ArrowUpDown",
    defaultConfig: DEFAULT_CONFIGS.rollup,
    readOnly: true,
    filterOperators: OPERATORS_FOR_TYPE.rollup,
  },
  {
    type: "created_time",
    label: "Created time",
    icon: "Clock",
    defaultConfig: DEFAULT_CONFIGS.created_time,
    readOnly: true,
    filterOperators: OPERATORS_FOR_TYPE.created_time,
  },
  {
    type: "created_by",
    label: "Created by",
    icon: "UserCheck",
    defaultConfig: DEFAULT_CONFIGS.created_by,
    readOnly: true,
    filterOperators: OPERATORS_FOR_TYPE.created_by,
  },
  {
    type: "edited_time",
    label: "Last edited time",
    icon: "Clock",
    defaultConfig: DEFAULT_CONFIGS.edited_time,
    readOnly: true,
    filterOperators: OPERATORS_FOR_TYPE.edited_time,
  },
  {
    type: "edited_by",
    label: "Last edited by",
    icon: "Edit3",
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
