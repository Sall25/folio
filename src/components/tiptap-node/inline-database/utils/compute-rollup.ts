import type {
  AggregationFunction,
  CellValue,
  ConfigOf,
  DatabaseProperty,
  DataSource,
  DataSourceRecord,
  ID,
  RelationValue,
} from "../types/types";

// ── Relation value reader ─────────────────────────────────────────────────
// Tolerates BOTH shapes: string[] (bare record ids) and RelationValue[]
// ({ recordId, ... }). Returns a flat list of target record ids.
function relationRecordIds(raw: unknown): ID[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "recordId" in item) {
        return String((item as RelationValue).recordId);
      }
      return null;
    })
    .filter((x): x is string => !!x);
}

// ── Value coercion helpers ─────────────────────────────────────────────────
function isEmpty(v: unknown): boolean {
  return (
    v === null ||
    v === undefined ||
    v === "" ||
    (Array.isArray(v) && v.length === 0)
  );
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toTime(v: unknown): number | null {
  if (typeof v !== "string" || !v) return null;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function valueToText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  // SelectOption-like { label }
  if (typeof v === "object" && "label" in (v as object)) {
    return String((v as { label: unknown }).label ?? "");
  }
  if (Array.isArray(v)) return v.map(valueToText).filter(Boolean).join(", ");
  return "";
}

// ── Aggregation ─────────────────────────────────────────────────────────────
function aggregate(
  values: unknown[],
  agg: AggregationFunction,
): CellValue<"rollup"> {
  const total = values.length;
  const nonEmpty = values.filter((v) => !isEmpty(v));

  switch (agg) {
    case "count":
      return total;
    case "count_values":
    case "count_not_empty":
      return nonEmpty.length;
    case "count_empty":
      return total - nonEmpty.length;
    case "count_unique":
      return new Set(nonEmpty.map((v) => JSON.stringify(v))).size;
    case "percent_empty":
      return total ? round(((total - nonEmpty.length) / total) * 100) : 0;
    case "percent_not_empty":
      return total ? round((nonEmpty.length / total) * 100) : 0;

    case "sum":
    case "average":
    case "median":
    case "min":
    case "max":
    case "range": {
      const nums = values.map(toNumber).filter((n): n is number => n !== null);
      if (!nums.length) return null;
      switch (agg) {
        case "sum":
          return round(nums.reduce((a, b) => a + b, 0));
        case "average":
          return round(nums.reduce((a, b) => a + b, 0) / nums.length);
        case "median": {
          const s = [...nums].sort((a, b) => a - b);
          const m = Math.floor(s.length / 2);
          return s.length % 2 ? s[m] : round((s[m - 1] + s[m]) / 2);
        }
        case "min":
          return Math.min(...nums);
        case "max":
          return Math.max(...nums);
        case "range":
          return Math.max(...nums) - Math.min(...nums);
      }
      return null;
    }

    case "earliest_date":
    case "latest_date":
    case "date_range": {
      const times = values.map(toTime).filter((n): n is number => n !== null);
      if (!times.length) return null;
      if (agg === "earliest_date")
        return new Date(Math.min(...times)).toISOString();
      if (agg === "latest_date")
        return new Date(Math.max(...times)).toISOString();
      // date_range → whole days between earliest and latest
      return Math.round((Math.max(...times) - Math.min(...times)) / 86400000);
    }

    case "checked":
      return values.filter((v) => v === true).length;
    case "unchecked":
      return values.filter((v) => v !== true).length;
    case "percent_checked":
      return total
        ? round((values.filter((v) => v === true).length / total) * 100)
        : 0;
    case "percent_unchecked":
      return total
        ? round((values.filter((v) => v !== true).length / total) * 100)
        : 0;

    case "show_original":
      return nonEmpty.map(valueToText).filter(Boolean).join(", ");

    default:
      return null;
  }
}

/**
 * Compute a rollup value for one record.
 *
 * Follows the record's relation (config.relationPropertyId) to its linked
 * target records, reads config.targetPropertyId from each, and aggregates with
 * config.aggregation. Pure + read-only — recomputed on render like a formula.
 */
export function computeRollup(args: {
  record: { values: Record<ID, unknown> };
  /** the CURRENT database's schema (to resolve the relation property) */
  properties: DatabaseProperty[];
  /** the related database, loaded by the caller */
  targetSource: DataSource | undefined;
  config: ConfigOf<"rollup">;
}): CellValue<"rollup"> {
  const { record, properties, targetSource, config } = args;
  if (!config.relationPropertyId) return null;

  const relationProp = properties.find(
    (p) => p.id === config.relationPropertyId,
  );
  if (!relationProp || relationProp.config.type !== "relation") return null;

  const ids = relationRecordIds(record.values[config.relationPropertyId]);

  // "Count all" = number of linked records; doesn't need the target loaded.
  if (config.aggregation === "count") return ids.length;

  if (!targetSource || !config.targetPropertyId) return null;

  const linked = ids
    .map((id) => targetSource.records.find((r) => r.id === id))
    .filter((r): r is DataSourceRecord => !!r);

  const values = linked.map((r) => r.values[config.targetPropertyId]);
  return aggregate(values, config.aggregation);
}
