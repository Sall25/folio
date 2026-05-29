import type { Node } from "@tiptap/pm/model";
import type { DatabaseProperty, SelectOption } from "../types/types";

export interface RecordGroup {
  key: string; // unique key for this group (the cell value as string)
  label: string; // display label
  color?: string; // optional color for select/status
  records: Node[]; // records belonging to this group
  isCollapsed: boolean;
}

function getCellValue(record: Node, propertyId: string): unknown {
  let value: unknown = null;
  record.forEach((cell) => {
    if (cell.attrs.propertyId !== propertyId) return;
    value = cell.attrs.value ?? null;
  });
  return value;
}

function getGroupKey(value: unknown, propertyType: string): string {
  if (value == null || value === "") return "__empty__";
  if (propertyType === "checkbox") return value ? "true" : "false";
  // SelectOption object — use its id
  if (typeof value === "object" && value !== null && "id" in value) {
    return String((value as { id: string }).id);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "__empty__";
    const first = value[0];
    return typeof first === "object" && first !== null && "id" in first
      ? String((first as { id: string }).id)
      : String(first);
  }
  return String(value);
}

function getGroupLabel(key: string, prop: DatabaseProperty): string {
  if (key === "__empty__") return "No " + prop.name;

  const config = prop.config;

  if (config.type === "select" || config.type === "multi_select") {
    const option = (config as { options: SelectOption[] }).options.find(
      (o) => o.id === key,
    );
    return option?.label ?? key;
  }

  if (config.type === "status") {
    const groups = (
      config as { groups: { items: { id: string; name: string }[] }[] }
    ).groups;
    const item = groups.flatMap((g) => g.items).find((i) => i.id === key);
    return item?.name ?? key;
  }

  if (config.type === "checkbox") {
    return key === "true" ? "Checked" : "Unchecked";
  }

  return key;
}

function getGroupColor(
  key: string,
  prop: DatabaseProperty,
): string | undefined {
  if (key === "__empty__") return undefined;
  const config = prop.config;

  if (config.type === "select" || config.type === "multi_select") {
    const option = (config as { options: SelectOption[] }).options.find(
      (o) => o.id === key,
    );
    return option?.color;
  }

  if (config.type === "status") {
    const groups = (
      config as { groups: { items: { id: string; color: string }[] }[] }
    ).groups;
    const item = groups.flatMap((g) => g.items).find((i) => i.id === key);
    return item?.color;
  }

  return undefined;
}

export function groupRecords(
  records: Node[],
  prop: DatabaseProperty,
  collapsedGroups: string[],
  showEmptyGroups: boolean,
): RecordGroup[] {
  // Bucket records by group key
  const buckets = new Map<string, Node[]>();

  for (const record of records) {
    const value = getCellValue(record, prop.id);
    const key = getGroupKey(value, prop.config.type);

    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(record);
  }

  // Build ordered groups based on property option order
  const orderedKeys: string[] = [];

  if (prop.config.type === "select" || prop.config.type === "multi_select") {
    const options = (prop.config as { options: SelectOption[] }).options;
    for (const opt of options) {
      if (buckets.has(opt.id)) orderedKeys.push(opt.id);
    }
  } else if (prop.config.type === "status") {
    const groups = (prop.config as { groups: { items: { id: string }[] }[] })
      .groups;
    for (const g of groups) {
      for (const item of g.items) {
        if (buckets.has(item.id)) orderedKeys.push(item.id);
      }
    }
  } else if (prop.config.type === "checkbox") {
    if (buckets.has("true")) orderedKeys.push("true");
    if (buckets.has("false")) orderedKeys.push("false");
  }

  // Add any remaining keys not in ordered list
  for (const key of buckets.keys()) {
    if (!orderedKeys.includes(key)) orderedKeys.push(key);
  }

  // Add empty group if needed
  if (showEmptyGroups && !orderedKeys.includes("__empty__")) {
    orderedKeys.push("__empty__");
  }

  return orderedKeys
    .filter((key) => showEmptyGroups || key !== "__empty__" || buckets.has(key))
    .map((key) => ({
      key,
      label: getGroupLabel(key, prop),
      color: getGroupColor(key, prop),
      records: buckets.get(key) ?? [],
      isCollapsed: collapsedGroups.includes(key),
    }));
}
