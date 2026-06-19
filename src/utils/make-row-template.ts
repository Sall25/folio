import { newId } from "src/lib/id";
import type { RowTemplate, DataSource, Page, ID, CellValue } from "src/types";
import { initialCellValue } from "./initial-cell-value";

// 1. an EMPTY template seeded from the source schema (all cells at type-default).
//    For "create a new blank template to edit."
export function makeRowTemplate(
  source: DataSource,
  opts: { name: string; icon?: string | null },
): RowTemplate {
  const values: Record<ID, CellValue> = {};
  for (const prop of source.properties) {
    values[prop.id] = initialCellValue(prop);
  }
  return {
    id: newId(),
    name: opts.name,
    icon: opts.icon ?? null,
    values,
    content: null,
    createdAt: Date.now(),
  };
}

// 2. a template snapshotted FROM an existing row-page.
//    For "save this row as a template."
export function makeRowTemplateFromRow(
  row: Page,
  opts: { name: string; icon?: string | null },
): RowTemplate {
  return {
    id: newId(),
    name: opts.name,
    icon: opts.icon ?? null,
    values: { ...(row.values ?? {}) },
    content: row.content ? structuredClone(row.content) : null,
    createdAt: Date.now(),
  };
}
