import { initialCellValue } from "./initial-cell-value";
import type {
  DataSource,
  Page,
  ID,
  CellValue,
  RowTemplate,
  PageCover,
  PageCategory,
} from "src/types";
import { makePage } from "./make-page";
import type { JSONContent } from "@tiptap/core";

export function makeRow(
  source: DataSource,
  opts: {
    ownerId: ID;
    title?: string;
    template?: RowTemplate;
    content?: JSONContent; // caller passes the cloned page content, if any
    category?: PageCategory; // so template pages can be "Template"
    cover?: PageCover;
  },
): Page {
  const values: Record<ID, CellValue> = {};
  for (const prop of source.properties) {
    values[prop.id] = initialCellValue(prop);
  }
  if (opts.template) {
    Object.assign(values, opts.template.values);
  }

  return {
    ...makePage({
      ownerId: opts.ownerId,
      title: opts.title ?? opts.template?.name ?? "",
      parentId: source.pageId,
      category: opts.category ?? "Private",
      cover: opts.cover ?? undefined,
    }),
    sourceId: source.id,
    values,
    content: opts.content ?? {
      type: "doc",
      content: [{ type: "title", content: [] }],
    },
  };
}
