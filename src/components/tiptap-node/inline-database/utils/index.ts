import type { JSONContent } from "@tiptap/core";
import {
  type DatabaseView,
  type PropertyConfig,
  type TableView,
} from "../types/types";
import type { DatabaseProperty } from "../types/types";

export function makeId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}

export function makeDefaultDatabase() {
  const titlePropId = makeId();
  const viewId = makeId();

  const properties: DatabaseProperty[] = [
    { id: titlePropId, name: "Name", config: { type: "title" }, width: 280 },
  ];

  const views: DatabaseView[] = [
    {
      id: viewId,
      type: "table",
      name: "Default view",
      filters: [],
      sorts: [],
      hiddenProperties: [],
      propertyOrder: properties.map((p) => p.id),
    } satisfies TableView,
  ];

  const attrs = {
    id: makeId(),
    title: "Untitled database",
    properties,
    views,
    activeViewId: viewId,
  };

  const content = [
    {
      type: "databaseRecord",
      attrs: { id: makeId(), createdAt: now(), updatedAt: now() },
      content: properties.map(makeCellNode),
    },
  ];

  return { attrs, content };
}

export function makeCellNode(prop: DatabaseProperty): JSONContent {
  switch (prop.config.type) {
    case "title":
      return {
        type: "titleCell",
        attrs: { propertyId: prop.id, pageId: null, parentId: null },
        content: [{ type: "paragraph" }],
      };
    case "text":
      return {
        type: "textCell",
        attrs: { propertyId: prop.id },
      };
    case "select":
      return {
        type: "selectCell",
        attrs: { propertyId: prop.id, value: null },
      };
    case "multi_select":
      return {
        type: "multiSelectCell",
        attrs: { propertyId: prop.id, value: [] },
      };
    case "status": {
      const config = prop.config as Extract<PropertyConfig, { type: "status" }>;
      const defaultItem = config.groups
        .flatMap((g) => g.items)
        .find((i) => i.isDefault);
      return {
        type: "statusCell",
        attrs: { propertyId: prop.id, value: defaultItem?.id ?? null },
      };
    }
    case "number":
      return {
        type: "numberCell",
        attrs: { propertyId: prop.id, value: null },
      };
    case "checkbox":
      return {
        type: "checkboxCell",
        attrs: { propertyId: prop.id, value: false },
      };
    case "date":
    case "created_time":
    case "edited_time":
      return { type: "dateCell", attrs: { propertyId: prop.id, value: null } };
    case "person":
    case "created_by":
    case "edited_by":
      return { type: "personCell", attrs: { propertyId: prop.id, value: [] } };
    case "formula":
      return {
        type: "formulaCell",
        attrs: { propertyId: prop.id, value: null },
      };
    case "relation":
      return {
        type: "relationCell",
        attrs: { propertyId: prop.id, value: [] },
      };
    case "rollup":
      return {
        type: "rollupCell",
        attrs: { propertyId: prop.id, value: null },
      };
    case "url":
      return {
        type: "urlCell",
        attrs: { propertyId: prop.id },
      };
    case "email":
      return {
        type: "emailCell",
        attrs: { propertyId: prop.id },
      };
    case "phone":
      return {
        type: "phoneCell",
        attrs: { propertyId: prop.id },
      };
  }
  return {};
}

export function makeDefaultView(
  type: DatabaseView["type"],
  name: string,
): DatabaseView {
  const base = {
    id: makeId(),
    name,
    filters: [],
    sorts: [],
    hiddenProperties: [],
  };

  switch (type) {
    case "table":
      return {
        ...base,
        type: "table",
        propertyOrder: [],
        frozenPropertyId: null,
      };
    case "board":
      return {
        ...base,
        type: "board",
        groupByPropertyId: "",
        showEmptyGroups: false,
      };
    case "list":
      return { ...base, type: "list", visibleProperties: [] };
    case "gallery":
      return {
        ...base,
        type: "gallery",
        cardSize: "medium",
        coverFit: "cover",
      };
  }
}
