import { newId } from "../lib/id";
import type { DatabaseProperty, DataSource, DatabaseView, ID } from "../types";
import { DEFAULT_CONFIGS } from "../types";

function defaultProperties(
  viewType: DatabaseView["type"] = "table",
  sourceId: ID = "",
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
  } else if (viewType === "form") {
    // A form's answers: who sent each one (set to the person answering) and
    // when. "Anonymous responses" (Share form) takes the first away.
    properties.push(
      {
        id: crypto.randomUUID(),
        name: "Respondent",
        config: { ...structuredClone(DEFAULT_CONFIGS.person), default: "me" },
        width: 180,
      },
      {
        id: crypto.randomUUID(),
        name: "Submission time",
        config: { type: "created_time" },
        width: 180,
      },
    );
  } else if (viewType === "graph") {
    // A graph draws a database's links to itself, so the thing it cannot
    // open without is the link: the stored side and its mirror, the same
    // pair sub-items is made of. Born with it, like a board is born with
    // its Status — otherwise the first graph anyone opens is a field of
    // dots with no way to join two of them.
    const outward = crypto.randomUUID();
    const inward = crypto.randomUUID();
    properties.push(
      {
        id: outward,
        name: "Related to",
        config: {
          type: "relation",
          targetSourceId: sourceId,
          showOnTarget: true,
          mirrorPropertyId: inward,
        },
        width: 200,
      } as DatabaseProperty,
      {
        id: inward,
        name: "Related from",
        config: {
          type: "relation",
          targetSourceId: sourceId,
          showOnTarget: false,
          mirrorPropertyId: outward,
        },
        width: 200,
      } as DatabaseProperty,
    );
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
  // Worked out before the properties, because a graph's relation points at
  // the database it belongs to.
  const id = opts.sourceId ?? newId();
  return {
    id,
    name: opts.name,
    pageId: opts.pageId,
    hostPageId: opts.hostPageId ?? null,
    properties: defaultProperties(opts.viewType, id),
    createdAt: Date.now(),
    updatedAt: null,
    views: [],
    savedViews: [],
    rowTemplates: [],
  };
}
