import type {
  FilterRule,
  FilterGroup,
  ViewFilter,
  TextFilterRule,
  NumberFilterRule,
  SelectFilterRule,
  MultiSelectFilterRule,
  CheckboxFilterRule,
  DateFilterRule,
  DateWithinRange,
} from "./filter-types";
import type { DatabaseRecord, CellValue } from "./types";

// ── Date range helpers ─────────────────────────────────────────────────────

function getWithinRange(range: DateWithinRange): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (range) {
    case "past_week":
    case "the_past_7_days":
      start.setDate(now.getDate() - 7);
      return { start, end: now };
    case "past_month":
    case "the_past_30_days":
      start.setDate(now.getDate() - 30);
      return { start, end: now };
    case "past_year":
      start.setFullYear(now.getFullYear() - 1);
      return { start, end: now };
    case "next_week":
      end.setDate(now.getDate() + 7);
      return { start: now, end };
    case "next_month":
      end.setDate(now.getDate() + 30);
      return { start: now, end };
    case "next_year":
      end.setFullYear(now.getFullYear() + 1);
      return { start: now, end };
  }
}

// ── isEmpty helper ─────────────────────────────────────────────────────────

function isEmpty(value: CellValue): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

// ── Rule evaluators ────────────────────────────────────────────────────────

function evaluateText(rule: TextFilterRule, value: CellValue): boolean {
  const str = typeof value === "string" ? value.toLowerCase() : "";
  const target = rule.value.toLowerCase();

  switch (rule.operator) {
    case "contains":
      return str.includes(target);
    case "does_not_contain":
      return !str.includes(target);
    case "is":
      return str === target;
    case "is_not":
      return str !== target;
    case "starts_with":
      return str.startsWith(target);
    case "ends_with":
      return str.endsWith(target);
    case "is_empty":
      return isEmpty(value);
    case "is_not_empty":
      return !isEmpty(value);
  }
}

function evaluateNumber(rule: NumberFilterRule, value: CellValue): boolean {
  if (rule.operator === "is_empty") return isEmpty(value);
  if (rule.operator === "is_not_empty") return !isEmpty(value);

  const num = typeof value === "number" ? value : parseFloat(value as string);
  if (isNaN(num)) return false;

  switch (rule.operator) {
    case "equals":
      return num === rule.value;
    case "does_not_equal":
      return num !== rule.value;
    case "greater_than":
      return num > rule.value;
    case "greater_than_or_equal":
      return num >= rule.value;
    case "less_than":
      return num < rule.value;
    case "less_than_or_equal":
      return num <= rule.value;
  }
}

function evaluateSelect(rule: SelectFilterRule, value: CellValue): boolean {
  switch (rule.operator) {
    case "is":
      return value === rule.value;
    case "is_not":
      return value !== rule.value;
    case "is_empty":
      return isEmpty(value);
    case "is_not_empty":
      return !isEmpty(value);
  }
}

function evaluateMultiSelect(
  rule: MultiSelectFilterRule,
  value: CellValue,
): boolean {
  const arr = Array.isArray(value) ? (value as string[]) : [];

  switch (rule.operator) {
    case "contains":
      return arr.includes(rule.value);
    case "does_not_contain":
      return !arr.includes(rule.value);
    case "is_empty":
      return arr.length === 0;
    case "is_not_empty":
      return arr.length > 0;
  }
}

function evaluateCheckbox(rule: CheckboxFilterRule, value: CellValue): boolean {
  const checked = value === true || value === "true";
  switch (rule.operator) {
    case "is_checked":
      return checked;
    case "is_unchecked":
      return !checked;
  }
}

function evaluateDate(rule: DateFilterRule, value: CellValue): boolean {
  if (rule.operator === "is_empty") return isEmpty(value);
  if (rule.operator === "is_not_empty") return !isEmpty(value);

  const date = value ? new Date(value as string) : null;
  if (!date || isNaN(date.getTime())) return false;

  if (rule.operator === "is_within") {
    const { start, end } = getWithinRange(rule.value as DateWithinRange);
    return date >= start && date <= end;
  }

  const target = rule.value ? new Date(rule.value as string) : null;
  if (!target) return false;

  // Normalize both to midnight for day-level comparisons
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  switch (rule.operator) {
    case "is":
      return d.getTime() === t.getTime();
    case "is_before":
      return d < t;
    case "is_after":
      return d > t;
    case "is_on_or_before":
      return d <= t;
    case "is_on_or_after":
      return d >= t;
  }
}

// ── Single rule evaluator (dispatcher) ────────────────────────────────────

function evaluateRule(rule: FilterRule, record: DatabaseRecord): boolean {
  const value = record[rule.propertyId] ?? null;

  switch (rule.propertyType) {
    case "title":
    case "text":
    case "url":
    case "email":
    case "phone":
    case "formula":
      return evaluateText(rule as TextFilterRule, value);

    case "number":
      // case "rollup":
      return evaluateNumber(rule as NumberFilterRule, value);

    case "select":
    case "status":
      return evaluateSelect(rule as SelectFilterRule, value);

    case "multi_select":
      return evaluateMultiSelect(rule as MultiSelectFilterRule, value);

    case "checkbox":
      return evaluateCheckbox(rule as CheckboxFilterRule, value);

    case "date":
    case "created_time":
    case "edited_time":
      return evaluateDate(rule as DateFilterRule, value);

    case "relation":
    case "person":
    case "created_by":
    case "edited_by": {
      // These are array-based "contains" checks
      const arr = Array.isArray(value) ? (value as string[]) : [];
      const op = rule.operator as string;
      if (op === "is_empty") return arr.length === 0;
      if (op === "is_not_empty") return arr.length > 0;
      if (op === "contains") return arr.includes(rule.value as string);
      if (op === "does_not_contain") return !arr.includes(rule.value as string);
      return false;
    }

    default:
      return true;
  }
}

// ── Group evaluator (recursive) ───────────────────────────────────────────

function isFilterGroup(item: FilterRule | FilterGroup): item is FilterGroup {
  return "rules" in item && "operator" in item;
}

function evaluateGroup(group: FilterGroup, record: DatabaseRecord): boolean {
  if (group.rules.length === 0) return true;

  if (group.operator === "and") {
    return group.rules.every((item) =>
      isFilterGroup(item)
        ? evaluateGroup(item, record)
        : evaluateRule(item, record),
    );
  } else {
    return group.rules.some((item) =>
      isFilterGroup(item)
        ? evaluateGroup(item, record)
        : evaluateRule(item, record),
    );
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns true if the record passes all filters in the view filter.
 */
export function recordMatchesFilter(
  record: DatabaseRecord,
  filter: ViewFilter | null | undefined,
): boolean {
  if (!filter || filter.rules.length === 0) return true;
  return evaluateGroup(filter as FilterGroup, record);
}

/**
 * Filters an array of records against a view filter.
 */
export function applyFilter(
  records: DatabaseRecord[],
  filter: ViewFilter | null | undefined,
): DatabaseRecord[] {
  if (!filter || filter.rules.length === 0) return records;
  return records.filter((r) => recordMatchesFilter(r, filter));
}
