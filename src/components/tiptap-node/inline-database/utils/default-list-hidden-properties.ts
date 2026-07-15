import type { DatabaseProperty, ID } from "src/types";
// Notion parity: a freshly created list view shows only the first few
// properties; the rest start hidden (the user can unhide them). Title is
// rendered on its own line, so it's never part of the count or the hidden set.
const DEFAULT_LIST_VISIBLE_PROPS = 3;

export function defaultListHiddenProperties(
  properties: DatabaseProperty[],
): ID[] {
  return properties
    .filter((p) => p.config.type !== "title")
    .slice(DEFAULT_LIST_VISIBLE_PROPS)
    .map((p) => p.id);
}
