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

  const prop = useDatabaseProperties(
    attrs,
    source,
    updatePropertiesAsync,
    ui.updateView,
  );

  return {
    ...prop,
    ...ui,
    title: attrs.title,
    onUpdateTitle,
  };
}
