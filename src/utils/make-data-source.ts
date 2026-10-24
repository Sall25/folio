import { newId } from "../lib/id";
import type { DatabaseProperty, DataSource, DatabaseView, ID } from "../types";
import { DEFAULT_CONFIGS } from "../types";

function defaultProperties(
  viewType: DatabaseView["type"] = "table",
): DatabaseProperty[] {
  const properties: DatabaseProperty[] = [
    {
      id: crypto.randomUUID(),
      name: "Name",
      config: { type: "title" },
      width: 240,
    },
  ];

  // What the first view needs to show something: a board its three status
  // columns, a calendar or timeline a date. Otherwise the Tags select.
  if (viewType === "board") {
    properties.push({
      id: crypto.randomUUID(),
      name: "Status",
      config: structuredClone(DEFAULT_CONFIGS.status),
      width: 160,
    });
  } else if (viewType === "calendar" || viewType === "timeline") {
    properties.push({
      id: crypto.randomUUID(),
      name: "Date",
      config: structuredClone(DEFAULT_CONFIGS.date),
      width: 160,
    });
  } else {
    properties.push({
      id: crypto.randomUUID(),
      name: "Tags",
      config: { type: "select", options: [] },
      width: 160,
    });
  }
  return properties;
}

export function makeDataSource(opts: {
  name: string;
  /** Its own page. Null for a database made from a block: it gets one when
   *  it's given a title. */
  pageId: ID | null;
  /** The page holding the block, while there's no page of its own. */
  hostPageId?: ID | null;
  sourceId?: ID;
  /** The view it's first shown in: picks the starting properties. */
  viewType?: DatabaseView["type"];
}): DataSource {
  return {
    id: opts.sourceId ?? newId(),
    name: opts.name,
    pageId: opts.pageId,
    hostPageId: opts.hostPageId ?? null,
    properties: defaultProperties(opts.viewType),
    createdAt: Date.now(),
    updatedAt: null,
    views: [],
    savedViews: [],
    rowTemplates: [],
  };
}
