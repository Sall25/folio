import {
  type PropertyType,
  type PropertyConfig,
  isReadOnlyProperty,
  type SelectOption,
  type PersonValue,
  type RelationValue,
  type StatusGroup,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Value migration matrix
//
// Converting a property's type means every record's value for that property is
// the WRONG shape for the new type. convertValue maps one value old→new.
//
// Strategy: a few structured pairs are handled directly (select↔multi_select,
// status, etc.); everything else routes through TEXT as a universal hub
// (toText → fromText). Unrepresentable targets (person/relation from text,
// or any computed/read-only type) yield empty/null.
// ─────────────────────────────────────────────────────────────────────────────

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function statusLabelById(
  groups: StatusGroup[] | undefined,
  id: unknown,
): string {
  if (!groups || typeof id !== "string") return "";
  for (const g of groups) {
    const item = g.items.find((i) => i.id === id);
    if (item) return item.name;
  }
  return "";
}

function statusIdByLabel(
  groups: StatusGroup[] | undefined,
  label: string,
): string | null {
  if (!groups) return null;
  const norm = label.trim().toLowerCase();
  for (const g of groups) {
    const item = g.items.find((i) => i.name.trim().toLowerCase() === norm);
    if (item) return item.id;
  }
  return null;
}

// ── Any value → display text ────────────────────────────────────────────────
function toText(
  value: unknown,
  from: PropertyType,
  fromConfig: PropertyConfig,
): string {
  if (value == null) return "";
  switch (from) {
    case "title":
    case "text":
    case "url":
    case "email":
    case "phone":
    case "formula":
    case "rollup":
    case "created_time":
    case "edited_time":
    case "created_by":
    case "edited_by":
      return String(value);
    case "number":
      return typeof value === "number" ? String(value) : "";
    case "checkbox":
      return value ? "Yes" : "No";
    case "date":
      return typeof value === "string" ? value : "";
    case "select":
      return (value as SelectOption)?.label ?? "";
    case "multi_select":
      return asArray<SelectOption>(value)
        .map((o) => o?.label ?? "")
        .filter(Boolean)
        .join(", ");
    case "status":
      return statusLabelById(
        fromConfig.type === "status" ? fromConfig.groups : undefined,
        value,
      );
    case "person":
      return asArray<PersonValue>(value)
        .map((p) => p?.name ?? "")
        .filter(Boolean)
        .join(", ");
    case "relation":
      // tolerate string[] or RelationValue[]
      return asArray<unknown>(value)
        .map((r) =>
          typeof r === "string"
            ? r
            : ((r as RelationValue)?.title ??
              String((r as RelationValue)?.pageId ?? "")),
        )
        .filter(Boolean)
        .join(", ");
    default:
      return "";
  }
}

// ── Text → a value of the target type ─────────────────────────────────────────
function fromText(
  text: string,
  to: PropertyType,
  toConfig: PropertyConfig,
): unknown {
  const t = text.trim();
  switch (to) {
    case "title":
    case "text":
    case "url":
    case "email":
    case "phone":
      return text;
    case "number": {
      if (t === "") return null;
      const n = Number(t.replace(/[, ]/g, ""));
      return Number.isFinite(n) ? n : null;
    }
    case "checkbox":
      return /^(true|yes|1|checked|done|✓)$/i.test(t);
    case "date": {
      if (!t) return null;
      const ms = Date.parse(t);
      return Number.isNaN(ms) ? null : new Date(ms).toISOString();
    }
    case "select": {
      if (!t || toConfig.type !== "select") return null;
      const found = toConfig.options.find(
        (o) => o.label.trim().toLowerCase() === t.toLowerCase(),
      );
      return found ?? null;
    }
    case "multi_select": {
      if (!t || toConfig.type !== "multi_select") return [];
      const parts = t
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return parts
        .map((label) =>
          toConfig.options.find(
            (o) => o.label.trim().toLowerCase() === label.toLowerCase(),
          ),
        )
        .filter((o): o is SelectOption => !!o);
    }
    case "status":
      return statusIdByLabel(
        toConfig.type === "status" ? toConfig.groups : undefined,
        t,
      );
    // No reliable reconstruction from text:
    case "person":
    case "relation":
      return to === "person" ? [] : [];
    default:
      return null;
  }
}

/**
 * Convert a single cell value from one property type to another.
 * Pure: maps value→value given the from/to configs. Does not mutate configs.
 */
export function convertValue(
  value: unknown,
  from: PropertyType,
  to: PropertyType,
  fromConfig: PropertyConfig,
  toConfig: PropertyConfig,
): unknown {
  if (from === to) return value;

  // Target is computed/read-only → it has no stored value.
  if (isReadOnlyProperty(to)) return null;

  // ── Structured pairs that keep option identity (no text round-trip) ──────
  if (from === "select" && to === "multi_select") {
    return value ? [value as SelectOption] : [];
  }
  if (from === "multi_select" && to === "select") {
    return asArray<SelectOption>(value)[0] ?? null;
  }

  // ── Everything else routes through text ──────────────────────────────────
  return fromText(toText(value, from, fromConfig), to, toConfig);
}
