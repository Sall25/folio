import type { Page } from "src/types";
import type {
  FilterGroup,
  FilterRule,
  FilterOperator,
} from "src/types/filter-types";
import { NO_VALUE_OPERATORS } from "src/types/filter-types";

export function getCellValue(record: Page, propertyId: string): unknown {
  return record.values?.[propertyId] ?? null;
}

function matchesRule(record: Page, rule: FilterRule): boolean {
  const value = getCellValue(record, rule.propertyId);

  const op: FilterOperator = rule.operator;

  if (NO_VALUE_OPERATORS.has(op)) {
    const isEmpty =
      value == null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);
    if (op === "is_empty") return isEmpty;
    if (op === "is_not_empty") return !isEmpty;
    if (op === "is_checked") return value === true;
    if (op === "is_unchecked") return value !== true;
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ruleValue = (rule as any).value;
  if (
    (rule.propertyType === "select" ||
      rule.propertyType === "multi_select" ||
      rule.propertyType === "status") &&
    (ruleValue == null || ruleValue === "")
  ) {
    return true;
  }

  if (rule.propertyType === "select") {
    const cellId =
      value && typeof value === "object" && "id" in value
        ? String((value as { id: unknown }).id)
        : String(value ?? "");
    console.log("SELECT match", {
      rawValue: value,
      cellId,
      ruleValue: String(ruleValue ?? ""),
      eq: cellId === String(ruleValue ?? ""),
    });
  }

  if (rule.propertyType === "select" || rule.propertyType === "status") {
    const cellId =
      value && typeof value === "object" && "id" in value
        ? String((value as { id: unknown }).id)
        : String(value ?? "");
    if (op === "is") return cellId === String(ruleValue ?? "");
    if (op === "is_not") return cellId !== String(ruleValue ?? "");
  }

  if (Array.isArray(value)) {
    const arr = value as unknown[];
    const has = arr.some(
      (x) => x === ruleValue || (x as { id?: unknown })?.id === ruleValue,
    );
    if (op === "contains") return has;
    if (op === "does_not_contain") return !has;
    return false;
  }

  // Date operators: normalize both sides to midnight so day-level
  // comparisons don't fail on time-of-day or ISO-vs-yyyy-mm-dd mismatches
  const DATE_OPS = new Set<FilterOperator>([
    "is",
    "is_before",
    "is_after",
    "is_on_or_before",
    "is_on_or_after",
  ]);
  if (
    (rule.propertyType === "date" ||
      rule.propertyType === "created_time" ||
      rule.propertyType === "edited_time") &&
    DATE_OPS.has(op)
  ) {
    const toDay = (v: unknown): number | null => {
      if (v == null || v === "") return null;
      const d = new Date(String(v));
      return isNaN(d.getTime())
        ? null
        : new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    };
    const a = toDay(value);
    const b = toDay(ruleValue);
    if (a == null || b == null) return false;
    switch (op) {
      case "is":
        return a === b;
      case "is_before":
        return a < b;
      case "is_after":
        return a > b;
      case "is_on_or_before":
        return a <= b;
      case "is_on_or_after":
        return a >= b;
    }
  }

  switch (op) {
    // Text operators
    case "contains":
      return String(value ?? "")
        .toLowerCase()
        .includes(String(ruleValue ?? "").toLowerCase());
    case "does_not_contain":
      return !String(value ?? "")
        .toLowerCase()
        .includes(String(ruleValue ?? "").toLowerCase());
    case "is":
      return String(value ?? "") === String(ruleValue ?? "");
    case "is_not":
      return String(value ?? "") !== String(ruleValue ?? "");
    case "starts_with":
      return String(value ?? "")
        .toLowerCase()
        .startsWith(String(ruleValue ?? "").toLowerCase());
    case "ends_with":
      return String(value ?? "")
        .toLowerCase()
        .endsWith(String(ruleValue ?? "").toLowerCase());

    // Number operators
    case "equals":
      return Number(value) === Number(ruleValue);
    case "does_not_equal":
      return Number(value) !== Number(ruleValue);
    case "greater_than":
      return Number(value) > Number(ruleValue);
    case "greater_than_or_equal":
      return Number(value) >= Number(ruleValue);
    case "less_than":
      return Number(value) < Number(ruleValue);
    case "less_than_or_equal":
      return Number(value) <= Number(ruleValue);

    // Date — is_within still handled here (operates on raw value)
    case "is_within": {
      const now = new Date();
      const d = new Date(String(value));
      const ranges: Record<string, [Date, Date]> = {
        past_week: [new Date(now.getTime() - 7 * 864e5), now],
        past_month: [new Date(now.getTime() - 30 * 864e5), now],
        past_year: [new Date(now.getTime() - 365 * 864e5), now],
        next_week: [now, new Date(now.getTime() + 7 * 864e5)],
        next_month: [now, new Date(now.getTime() + 30 * 864e5)],
        next_year: [now, new Date(now.getTime() + 365 * 864e5)],
        the_past_7_days: [new Date(now.getTime() - 7 * 864e5), now],
        the_past_30_days: [new Date(now.getTime() - 30 * 864e5), now],
      };
      const range = ranges[String(ruleValue)];
      if (!range) return false;
      return d >= range[0] && d <= range[1];
    }

    default:
      return true;
  }
}

function matchesGroup(record: Page, group: FilterGroup): boolean {
  const rules = group.rules as FilterRule[];
  if (rules.length === 0) return true;
  if (group.operator === "and")
    return rules.every((r) => matchesRule(record, r));
  return rules.some((r) => matchesRule(record, r));
}

/**
 * Returns true if the record should be shown given the view's filters.
 */
export function recordMatchesFilters(
  record: Page,
  filters: FilterGroup[],
): boolean {
  if (!filters || filters.length === 0) return true;
  return filters.every((group) => matchesGroup(record, group));
}
