import type {
  FilterGroup,
  FilterRule,
  FilterOperator,
} from "src/types/filter-types";
import { NO_VALUE_OPERATORS } from "src/types/filter-types";
import type { Page, DatabaseProperty } from "src/types";
import { relationRecordIds } from "src/lib/relation-ids";
import { toDate } from "./date-values";

/**
 * A record's value for a property.
 *
 * The TITLE property is special: its value is the page's own title, not an
 * entry in values[]. (The title cell is an atom that reads page.title — see the
 * title-as-atom change.) Reading values[titlePropId] returns null, which is why
 * sorting and filtering by Name silently did nothing.
 */
export function getCellValue(
  record: Page,
  propertyId: string,
  properties?: DatabaseProperty[],
): unknown {
  const prop = properties?.find((p) => p.id === propertyId);
  if (prop?.config.type === "title") return record.title ?? "";
  // Created by / Edited by live on the page, not in values[]. Same shape as a
  // person cell (a list of {id}) so filters and sorts treat them alike.
  if (prop?.config.type === "created_by")
    return record.ownerId ? [{ id: record.ownerId }] : [];
  if (prop?.config.type === "edited_by") {
    const id = record.editedBy ?? record.ownerId;
    return id ? [{ id }] : [];
  }
  if (prop?.config.type === "created_time") return record.createdAt ?? null;
  if (prop?.config.type === "edited_time")
    return record.updatedAt ?? record.createdAt ?? null;
  return record.values?.[propertyId] ?? null;
}

/** What a filter needs to know about the viewer. */
export type FilterContext = {
  /** The signed-in person's id, for the "Me" person filter value. */
  meId?: string | null;
  /** Page id → title, for relation filters matched by name. */
  titleOf?: (id: string) => string | undefined;
};

/** The "Me" value of a person filter: whoever is looking at the view. */
export const ME_FILTER_VALUE = "me";

// Person rules store a list of person ids (older rules: one id string).
function personRuleIds(ruleValue: unknown, ctx: FilterContext): string[] {
  const raw = Array.isArray(ruleValue)
    ? ruleValue.map(String)
    : ruleValue
      ? [String(ruleValue)]
      : [];
  return raw.flatMap((id) =>
    id === ME_FILTER_VALUE ? (ctx.meId ? [ctx.meId] : []) : [id],
  );
}

function matchesRule(
  record: Page,
  rule: FilterRule,
  properties: DatabaseProperty[] | undefined,
  ctx: FilterContext,
): boolean {
  const value = getCellValue(record, rule.propertyId, properties);

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

  const hasNoValue =
    ruleValue == null ||
    ruleValue === "" ||
    (Array.isArray(ruleValue) && ruleValue.length === 0);

  if (
    (rule.propertyType === "select" ||
      rule.propertyType === "multi_select" ||
      rule.propertyType === "status") &&
    hasNoValue
  ) {
    return true;
  }

  if (
    rule.propertyType === "person" ||
    rule.propertyType === "created_by" ||
    rule.propertyType === "edited_by"
  ) {
    // No person picked yet (or only "Me" while signed out): show everything.
    const ruleIds = hasNoValue ? [] : personRuleIds(ruleValue, ctx);
    if (ruleIds.length === 0) return true;
    const cellIds = Array.isArray(value)
      ? value.map((v) =>
          v && typeof v === "object" && "id" in v
            ? String((v as { id: unknown }).id)
            : String(v),
        )
      : [];
    const overlap = cellIds.some((id) => ruleIds.includes(id));
    if (op === "contains") return overlap;
    if (op === "does_not_contain") return !overlap;
    return true;
  }

  // Rollups are resolved into values upstream (resolveRecordRollups). They
  // compare as numbers (count, sum, percent…) or, for earliest / latest
  // date, as days.
  if ((rule.propertyType as string) === "rollup") {
    if (hasNoValue) return true;
    const toComparable = (v: unknown): number | null => {
      if (typeof v === "number") return v;
      if (typeof v !== "string" || v.trim() === "") return null;
      if (!isNaN(Number(v))) return Number(v);
      const d = new Date(v);
      return isNaN(d.getTime())
        ? null
        : new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    };
    const a = toComparable(value);
    const b = toComparable(ruleValue);
    if (a !== null && b !== null) {
      switch (op) {
        case "equals":
          return a === b;
        case "does_not_equal":
          return a !== b;
        case "greater_than":
          return a > b;
        case "greater_than_or_equal":
          return a >= b;
        case "less_than":
          return a < b;
        case "less_than_or_equal":
          return a <= b;
      }
    }
    if (op === "does_not_equal") return a === null || a !== b;
    if (a === null || b === null) {
      // Text rollups ("Show original"): compare as text.
      const text = String(value ?? "").toLowerCase();
      const q = String(ruleValue).toLowerCase();
      if (op === "equals") return text === q;
      if (op === "contains") return text.includes(q);
      return false;
    }
  }

  if (rule.propertyType === "relation") {
    // The cell holds linked page ids (mirror sides are resolved into values
    // upstream, see resolveMirrorRelations).
    const cellIds = relationRecordIds(value);
    if (hasNoValue) return true;

    // Picked pages: matches if any linked page is among them.
    if (Array.isArray(ruleValue)) {
      const ruleIds = ruleValue.map(String);
      const overlap = cellIds.some((id) => ruleIds.includes(id));
      if (op === "contains") return overlap;
      if (op === "does_not_contain") return !overlap;
      return true;
    }

    // Typed text (older rules, the advanced builder): match the linked pages'
    // titles, or a raw id.
    const q = String(ruleValue).trim().toLowerCase();
    const hit = cellIds.some(
      (id) =>
        id === ruleValue || (ctx.titleOf?.(id) ?? "").toLowerCase().includes(q),
    );
    if (op === "contains") return hit;
    if (op === "does_not_contain") return !hit;
    return true;
  }

  if (rule.propertyType === "select" || rule.propertyType === "multi_select") {
    const ruleIds = Array.isArray(ruleValue) ? ruleValue.map(String) : [];

    if (rule.propertyType === "select") {
      // cell holds ONE option {id} → matches if its id is among the selected ids
      const cellId =
        value && typeof value === "object" && "id" in value
          ? String((value as { id: unknown }).id)
          : String(value ?? "");
      if (op === "is") return ruleIds.includes(cellId); // is any of
      if (op === "is_not") return !ruleIds.includes(cellId);
    }

    if (rule.propertyType === "multi_select") {
      // cell holds MULTIPLE options → matches if ANY overlaps the selected ids
      const cellIds = Array.isArray(value)
        ? value.map((v) =>
            v && typeof v === "object" && "id" in v
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                String((v as any).id)
              : String(v),
          )
        : [];
      const overlap = cellIds.some((id) => ruleIds.includes(id));
      if (op === "contains") return overlap;
      if (op === "does_not_contain") return !overlap;
    }
  }

  if (rule.propertyType === "status") {
    const cellId =
      value && typeof value === "object" && "id" in value
        ? String((value as { id: unknown }).id)
        : String(value ?? "");

    if (rule.propertyType === "status") {
      const ruleIds = Array.isArray(ruleValue) ? ruleValue.map(String) : [];

      if (op === "is") {
        return ruleIds.includes(cellId);
      }

      if (op === "is_not") {
        return !ruleIds.includes(cellId);
      }
    }
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
      const d = toDate(v);
      return d === null
        ? null
        : new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    };
    const a = toDay(value);
    const b = toDay(ruleValue);

    if (b == null) return true;
    if (a == null) return false;

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
      const d = toDate(value);
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
      return d !== null && d >= range[0] && d <= range[1];
    }

    default:
      return true;
  }
}

function matchesGroup(
  record: Page,
  group: FilterGroup,
  properties: DatabaseProperty[] | undefined,
  ctx: FilterContext,
): boolean {
  const rules = group.rules as FilterRule[];
  if (rules.length === 0) return true;
  if (group.operator === "and")
    return rules.every((r) => matchesRule(record, r, properties, ctx));
  return rules.some((r) => matchesRule(record, r, properties, ctx));
}

/** One condition on its own (conditional color uses these). */
export function recordMatchesRule(
  record: Page,
  rule: FilterRule,
  properties?: DatabaseProperty[],
  ctx: FilterContext = {},
): boolean {
  return matchesRule(record, rule, properties, ctx);
}

export function recordMatchesFilters(
  record: Page,
  filters: FilterGroup[],
  properties?: DatabaseProperty[],
  ctx: FilterContext = {},
): boolean {
  if (!filters || filters.length === 0) return true;
  return filters.every((group) => matchesGroup(record, group, properties, ctx));
}
