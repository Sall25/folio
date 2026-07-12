// Pure builders that turn DataSource records + properties into the ProseMirror
// node tree (databaseRecord > databaseCell), parallel to databasePageContent in
// make-page.ts. Used to SEED the database node's children at creation time (and
// to build a single record node when a row is added later).
//
// Channel principle: cells carry recordId/propertyId (pointers), content-type
// cells (title/text) also carry the value as inline text so it renders and is
// natively editable; atom cells stay empty (their widget reads the value from
// the bridge/DataSource).

import type { JSONContent } from "@tiptap/core";
import type { DatabaseProperty, ID, Page } from "src/types";

const CONTENT_TYPES = new Set(["title", "text"]);

// One cell node for a given record + property.
export function buildCellNode(
  recordId: ID,
  databaseId: ID,
  property: DatabaseProperty,
  value: unknown,
): JSONContent {
  const isContent = CONTENT_TYPES.has(property.config.type);
  const text =
    isContent && value != null && String(value).length > 0 ? String(value) : "";
  console.log("[buildCell]", property.config.type, { value, text });

  return {
    type: "databaseCell",
    attrs: { recordId, propertyId: property.id, databaseId },
    // Content cells seed their text; atom cells stay empty (inline* allows 0).
    content: text ? [{ type: "text", text }] : [],
  };
}

// One record node (a row) with a cell per property.
// One record node (a row) with a cell per property.
export function buildRecordNode(
  record: Page,
  sourceId: ID,
  databaseId: ID,
  properties: DatabaseProperty[],
): JSONContent {
  return {
    type: "databaseRecord",
    attrs: { recordId: record.id, sourceId, databaseId },
    content: properties.map((prop) =>
      buildCellNode(
        record.id,
        databaseId,
        prop,
        // The title property's value IS the page's title — it lives on the Page
        // record itself, not in values[]. Reading values[titlePropId] gets null
        // and seeds an empty cell, which is why titles rendered blank.
        prop.config.type === "title" ? record.title : record.values?.[prop.id],
      ),
    ),
  };
}

// The full set of record nodes for a database — the seed payload.
export function buildRecordNodes(
  records: Page[],
  sourceId: ID,
  databaseId: ID,
  properties: DatabaseProperty[],
): JSONContent[] {
  return records.map((r) =>
    buildRecordNode(r, sourceId, databaseId, properties),
  );
}
