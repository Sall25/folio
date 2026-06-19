import { newId } from "../lib/id";
import type { DatabaseProperty, DataSource, ID } from "../types";

function defaultProperties(): DatabaseProperty[] {
  return [
    {
      id: crypto.randomUUID(),
      name: "Name",
      config: { type: "title" },
      width: 240,
    },
    {
      id: crypto.randomUUID(),
      name: "Tags",
      config: { type: "select", options: [] },
      width: 160,
    },
  ];
}

export function makeDataSource(opts: {
  name: string;
  pageId: ID;
  sourceId?: ID;
}): DataSource {
  return {
    id: opts.sourceId ?? newId(),
    name: opts.name,
    pageId: opts.pageId,
    properties: defaultProperties(), // schema starts empty; add via useAddProperty
    createdAt: Date.now(),
    updatedAt: null,
    views: [],
    savedViews: [],
    rowTemplates: [],
  };
}
