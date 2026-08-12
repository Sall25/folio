import type { DatabaseProperty } from "src/types";

const NONE_COLUMN_ID = "__none__";

export function columnKeyFor(value: unknown, prop: DatabaseProperty): string {
  if (value == null) return NONE_COLUMN_ID;
  const t = prop.config.type;
  if (t === "checkbox") return value ? "true" : "false";
  if (t === "select" || t === "status") {
    return typeof value === "object" && value !== null && "id" in value
      ? String((value as { id: string }).id)
      : String(value);
  }
  if (t === "multi_select") {
    const arr = Array.isArray(value) ? value : [];
    const first = arr[0];
    if (first == null) return NONE_COLUMN_ID;
    return typeof first === "object" && "id" in first
      ? String((first as { id: string }).id)
      : String(first);
  }
  return NONE_COLUMN_ID;
}
