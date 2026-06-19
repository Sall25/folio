import type { DatabaseProperty, Page } from "src/types";

export const NONE_KEY = "__none__";
export const ALL_KEY = "__all__";

export function groupKeyFor(value: unknown, prop: DatabaseProperty): string {
  if (value == null) return NONE_KEY;
  const t = prop.config.type;
  if (t === "checkbox") return value ? "true" : "false";
  if (typeof value === "object" && value !== null && "id" in value)
    return String((value as { id: string }).id);
  if (Array.isArray(value)) {
    const first = value[0];
    return first == null
      ? NONE_KEY
      : typeof first === "object" && "id" in first
        ? String((first as { id: string }).id)
        : String(first);
  }
  return String(value);
}

export function groupLabel(key: string, prop: DatabaseProperty): string {
  if (key === NONE_KEY) return `No ${prop.name}`;
  const cfg = prop.config;
  if (cfg.type === "select" || cfg.type === "multi_select")
    return cfg.options.find((o) => o.id === key)?.label ?? key;
  if (cfg.type === "status")
    return (
      cfg.groups.flatMap((g) => g.items).find((i) => i.id === key)?.name ?? key
    );
  if (cfg.type === "checkbox") return key === "true" ? "Checked" : "Unchecked";
  return key;
}

export interface RecordGroup {
  key: string;
  label: string;
  records: Page[]; // whole pages — consumers need .id / .values
}

/**
 * Buckets ROWS (pages) by the given group property. No group property →
 * one bucket with every row (key = ALL_KEY).
 */
export function groupRecords(
  rows: Page[],
  groupProp: DatabaseProperty | undefined,
): RecordGroup[] {
  if (!groupProp) {
    return [{ key: ALL_KEY, label: "", records: rows }];
  }
  const map = new Map<string, Page[]>();
  for (const row of rows) {
    const key = groupKeyFor(row.values?.[groupProp.id], groupProp);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return [...map.entries()].map(([key, records]) => ({
    key,
    label: groupLabel(key, groupProp),
    records,
  }));
}
