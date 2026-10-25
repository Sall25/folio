import { initialCellValue } from "./initial-cell-value";
import type {
  DataSource,
  Page,
  ID,
  CellValue,
  RowTemplate,
  PageCover,
  PageCategory,
  PersonValue,
} from "src/types";
import { makePage } from "./make-page";
import type { JSONContent } from "@tiptap/core";

export function makeRow(
  source: DataSource,
  opts: {
    ownerId: ID;
    workspaceId: ID;
    title?: string;
    template?: RowTemplate;
    content?: JSONContent; // caller passes the cloned page content, if any
    category?: PageCategory; // so template pages can be "Template"
    cover?: PageCover;
    /** The person creating the row, for person properties whose default is
     *  "Me". Leave it out for template pages so "Me" stays a rule, not a
     *  name baked into the template. */
    me?: PersonValue;
  },
): Page {
  const values: Record<ID, CellValue> = {};
  for (const prop of source.properties) {
    values[prop.id] = initialCellValue(prop);
  }
  if (opts.template) {
    Object.assign(values, opts.template.values);
  }
  // Person defaults: "Me" fills an empty person cell (a template that set
  // the person keeps its value).
  if (opts.me) {
    for (const prop of source.properties) {
      if (prop.config.type !== "person" || prop.config.default !== "me")
        continue;
      const current = values[prop.id];
      if (Array.isArray(current) && current.length > 0) continue;
      values[prop.id] = [opts.me] as CellValue;
    }
  }

  return {
    ...makePage({
      ownerId: opts.ownerId,
      title: opts.title ?? opts.template?.name ?? "",
      // Under the database's page; before it has one, under the page
      // holding its block (same access as the database).
      parentId: source.pageId ?? source.hostPageId ?? null,
      category: opts.category ?? "Private",
      cover: opts.cover ?? undefined,
      workspaceId: opts.workspaceId,
    }),
    sourceId: source.id,
    values,
    content: opts.content ?? {
      type: "doc",
      content: [{ type: "title", content: [] }],
    },
  };
}
