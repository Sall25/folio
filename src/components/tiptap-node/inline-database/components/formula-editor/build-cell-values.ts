import type { Node } from "@tiptap/pm/model";
import type { DatabaseProperty, CellValue, ID } from "src/types";

/**
 * Walks a databaseRecord node's children and extracts each cell's value
 * into a flat map of { propertyId → CellValue }.
 *
 * Content-based cells (title, text) don't have a `value` attr —
 * their value is the node's text content.
 */
export function buildCellValueMap(
  recordNode: Node,
  properties: DatabaseProperty[],
): Record<ID, CellValue> {
  const map: Record<ID, CellValue> = {};

  // Index properties by id for O(1) lookup
  const propById = new Map(properties.map((p) => [p.id, p]));

  recordNode.forEach((cellNode) => {
    const { propertyId, value } = cellNode.attrs as {
      propertyId: ID | null;
      value?: CellValue;
    };

    if (!propertyId) return;

    const prop = propById.get(propertyId);
    if (!prop) return;

    if (prop.config.type === "title" || prop.config.type === "text") {
      // Content-based — extract plain text from the node
      map[propertyId] = cellNode.textContent;
    } else {
      // Value-based — read directly from attrs
      map[propertyId] = value ?? null;
    }
  });

  return map;
}
