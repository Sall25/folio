import type { PropertyType, ID } from "./types";

// ── Operators per property type ────────────────────────────────────────────

export type TextOperator =
  | "contains"
  | "does_not_contain"
  | "is"
  | "is_not"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty";

export type NumberOperator =
  | "equals"
  | "does_not_equal"
  | "greater_than"
  | "greater_than_or_equal"
  | "less_than"
  | "less_than_or_equal"
  | "is_empty"
  | "is_not_empty";

export type SelectOperator = "is" | "is_not" | "is_empty" | "is_not_empty";

export type MultiSelectOperator =
  | "contains"
  | "does_not_contain"
  | "is_empty"
  | "is_not_empty";

export type StatusOperator = "is" | "is_not" | "is_empty" | "is_not_empty";

export type CheckboxOperator = "is_checked" | "is_unchecked";

export type DateOperator =
  | "is"
  | "is_before"
  | "is_after"
  | "is_on_or_before"
  | "is_on_or_after"
  | "is_empty"
  | "is_not_empty"
  | "is_within";

export type DateWithinRange =
  | "past_week"
  | "past_month"
  | "past_year"
  | "next_week"
  | "next_month"
  | "next_year"
  | "the_past_7_days"
  | "the_past_30_days";

export type RelationOperator =
  | "contains"
  | "does_not_contain"
  | "is_empty"
  | "is_not_empty";

export type FormulaOperator =
  | "contains"
  | "does_not_contain"
  | "is"
  | "is_not"
  | "is_empty"
  | "is_not_empty";

export type PersonOperator =
  | "contains"
  | "does_not_contain"
  | "is_empty"
  | "is_not_empty";

// All operators combined (useful for storing in a generic filter row)
export type FilterOperator =
  | TextOperator
  | NumberOperator
  | SelectOperator
  | MultiSelectOperator
  | StatusOperator
  | CheckboxOperator
  | DateOperator
  | RelationOperator
  | FormulaOperator
  | PersonOperator;

// ── Filter rule shapes ─────────────────────────────────────────────────────

interface BaseFilterRule {
  id: ID;
  propertyId: ID;
}

export interface TextFilterRule extends BaseFilterRule {
  propertyType: "title" | "text" | "url" | "email" | "phone";
  operator: TextOperator;
  value: string;
}

export interface NumberFilterRule extends BaseFilterRule {
  propertyType: "number";
  operator: NumberOperator;
  value: number;
}

export interface SelectFilterRule extends BaseFilterRule {
  propertyType: "select";
  operator: SelectOperator;
  value: string; // option id
}

export interface MultiSelectFilterRule extends BaseFilterRule {
  propertyType: "multi_select";
  operator: MultiSelectOperator;
  value: string; // option id
}

export interface StatusFilterRule extends BaseFilterRule {
  propertyType: "status";
  operator: StatusOperator;
  value: string; // option id
}

export interface CheckboxFilterRule extends BaseFilterRule {
  propertyType: "checkbox";
  operator: CheckboxOperator;
  value?: never; // no value needed
}

export interface DateFilterRule extends BaseFilterRule {
  propertyType: "date" | "created_time" | "edited_time";
  operator: DateOperator;
  value: string | DateWithinRange | null; // ISO date string OR within range
}

export interface RelationFilterRule extends BaseFilterRule {
  propertyType: "relation";
  operator: RelationOperator;
  value: string; // record id
}

export interface FormulaFilterRule extends BaseFilterRule {
  propertyType: "formula";
  operator: FormulaOperator;
  value: string;
}

export interface PersonFilterRule extends BaseFilterRule {
  propertyType: "person" | "created_by" | "edited_by";
  operator: PersonOperator;
  value: string; // user id
}

// The discriminated union
export type FilterRule =
  | TextFilterRule
  | NumberFilterRule
  | SelectFilterRule
  | MultiSelectFilterRule
  | StatusFilterRule
  | CheckboxFilterRule
  | DateFilterRule
  | RelationFilterRule
  | FormulaFilterRule
  | PersonFilterRule;

// ── Filter group (AND / OR) ────────────────────────────────────────────────

export type FilterGroupOperator = "and" | "or";

export interface FilterGroup {
  id: ID;
  operator: FilterGroupOperator;
  rules: Array<FilterRule | FilterGroup>;
}

// Top-level filter stored on the view
export interface ViewFilter {
  operator: FilterGroupOperator;
  rules: Array<FilterRule | FilterGroup>;
}

// ── Operator metadata ──────────────────────────────────────────────────────

export const OPERATORS_FOR_TYPE: Record<PropertyType, FilterOperator[]> = {
  title: [
    "contains",
    "does_not_contain",
    "is",
    "is_not",
    "starts_with",
    "ends_with",
    "is_empty",
    "is_not_empty",
  ],
  text: [
    "contains",
    "does_not_contain",
    "is",
    "is_not",
    "starts_with",
    "ends_with",
    "is_empty",
    "is_not_empty",
  ],
  url: [
    "contains",
    "does_not_contain",
    "is",
    "is_not",
    "starts_with",
    "ends_with",
    "is_empty",
    "is_not_empty",
  ],
  email: [
    "contains",
    "does_not_contain",
    "is",
    "is_not",
    "starts_with",
    "ends_with",
    "is_empty",
    "is_not_empty",
  ],
  phone: [
    "contains",
    "does_not_contain",
    "is",
    "is_not",
    "starts_with",
    "ends_with",
    "is_empty",
    "is_not_empty",
  ],
  number: [
    "equals",
    "does_not_equal",
    "greater_than",
    "greater_than_or_equal",
    "less_than",
    "less_than_or_equal",
    "is_empty",
    "is_not_empty",
  ],
  select: ["is", "is_not", "is_empty", "is_not_empty"],
  multi_select: ["contains", "does_not_contain", "is_empty", "is_not_empty"],
  status: ["is", "is_not", "is_empty", "is_not_empty"],
  checkbox: ["is_checked", "is_unchecked"],
  date: [
    "is",
    "is_before",
    "is_after",
    "is_on_or_before",
    "is_on_or_after",
    "is_within",
    "is_empty",
    "is_not_empty",
  ],
  created_time: [
    "is",
    "is_before",
    "is_after",
    "is_on_or_before",
    "is_on_or_after",
    "is_within",
    "is_empty",
    "is_not_empty",
  ],
  edited_time: [
    "is",
    "is_before",
    "is_after",
    "is_on_or_before",
    "is_on_or_after",
    "is_within",
    "is_empty",
    "is_not_empty",
  ],
  relation: ["contains", "does_not_contain", "is_empty", "is_not_empty"],
  formula: [
    "contains",
    "does_not_contain",
    "is",
    "is_not",
    "is_empty",
    "is_not_empty",
  ],
  person: ["contains", "does_not_contain", "is_empty", "is_not_empty"],
  created_by: ["contains", "does_not_contain", "is_empty", "is_not_empty"],
  edited_by: ["contains", "does_not_contain", "is_empty", "is_not_empty"],
  rollup: [
    "equals",
    "does_not_equal",
    "greater_than",
    "greater_than_or_equal",
    "less_than",
    "less_than_or_equal",
    "is_empty",
    "is_not_empty",
  ],
};

export const OPERATOR_LABEL: Record<FilterOperator, string> = {
  contains: "contains",
  does_not_contain: "does not contain",
  is: "is",
  is_not: "is not",
  starts_with: "starts with",
  ends_with: "ends with",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  equals: "=",
  does_not_equal: "≠",
  greater_than: ">",
  greater_than_or_equal: "≥",
  less_than: "<",
  less_than_or_equal: "≤",
  is_checked: "is checked",
  is_unchecked: "is unchecked",
  is_before: "is before",
  is_after: "is after",
  is_on_or_before: "is on or before",
  is_on_or_after: "is on or after",
  is_within: "is within",
};

// Operators that require no value input
export const NO_VALUE_OPERATORS = new Set<FilterOperator>([
  "is_empty",
  "is_not_empty",
  "is_checked",
  "is_unchecked",
]);
