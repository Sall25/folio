import type { DatabaseAttrs, DatabaseProperty } from "../types/types";
import { useDatabaseProperties } from "./use-database-properties";
import { useDatabaseUI } from "./use-database-ui";

export type UseDatabaseReturn = ReturnType<typeof useDatabase>;

export function useDatabase(
  attrs: DatabaseAttrs,
  updateAttributes: (attrs: Record<string, unknown>) => void,
  source: { properties: DatabaseProperty[] },
  updatePropertiesAsync: (properties: DatabaseProperty[]) => Promise<unknown>,
  onUpdateTitle?: (title: string) => void,
) {
  const ui = useDatabaseUI(attrs, updateAttributes);

  // Property/view-config edits (freeze, hide, unwrap, sort, filter, group)
  // write through the SAME per-node updateView the node renders from.
  const prop = useDatabaseProperties(
    attrs,
    source,
    updatePropertiesAsync,
    ui.updateView,
  );

  return {
    ...prop,
    ...ui,
    views: attrs.views,
    title: attrs.title,
    onUpdateTitle,
  };
}
