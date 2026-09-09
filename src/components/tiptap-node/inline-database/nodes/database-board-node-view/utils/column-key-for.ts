import type { DatabaseProperty } from "src/types";

export const NONE_COLUMN_ID = "__none__";

export function columnKeyFor(value: unknown, prop: DatabaseProperty): string {
  if (value == null) return NONE_COLUMN_ID;
  const t = prop.config.type;

  if (t === "checkbox") return value ? "true" : "false";

  if (t === "select" || t === "status") {
    return typeof value === "object" && value !== null && "id" in value
      ? String((value as { id: string }).id)
      : String(value);
  }

  if (t === "multi_select" || t === "person") {
    const arr = Array.isArray(value) ? value : [];
    const first = arr[0];
    if (first == null) return NONE_COLUMN_ID;
    return typeof first === "object" && first !== null && "id" in first
      ? String((first as { id: string }).id)
      : String(first);
  }

  if (t === "date" || t === "created_time" || t === "edited_time") {
    const d = new Date(String(value));
    return isNaN(d.getTime()) ? NONE_COLUMN_ID : d.toISOString().slice(0, 10);
  }

  // text, number, url, email, phone, formula, rollup → group by the raw value
  return String(value);
}
