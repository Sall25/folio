import { initialCellValue } from "./initial-cell-value";
import type { DataSource, Page, ID, CellValue, RowTemplate } from "../types";
import { makePage } from "./make-page";

export function makeRow(
  source: DataSource,
  opts?: { title?: string; template?: RowTemplate },
): Page {
  const values: Record<ID, CellValue> = {};
  for (const prop of source.properties) {
    values[prop.id] = initialCellValue(prop); // defaults first
  }
  if (opts?.template) {
    Object.assign(values, opts.template.values); // template overlays where set
  }

  return {
    ...makePage({
      title: opts?.title ?? opts?.template?.name ?? "",
      parentId: source.pageId, // rows nested under container (default)
      category: "Private",
    }),
    sourceId: source.id,
    values,
    content: opts?.template?.content
      ? structuredClone(opts.template.content)
      : { type: "doc", content: [{ type: "title", content: [] }] },
  };
}
