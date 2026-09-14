import { useEffect, useMemo, useRef } from "react";
import type { DatabaseAttrs, DatabaseProperty } from "src/types";
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
  const ui = useDatabaseUI(attrs, updateAttributes, source.properties);

  // Property/view-config edits (freeze, hide, unwrap, sort, filter, group)
  // write through the SAME per-node updateView the node renders from.
  const prop = useDatabaseProperties(
    attrs,
    source,
    updatePropertiesAsync,
    ui.updateView,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _dbg = useRef<any>({});
  useEffect(() => {
    const prev = _dbg.current;
    const changed: string[] = [];
    if (prev.prop !== prop) changed.push("prop");
    if (prev.ui !== ui) changed.push("ui");
    if (prev.views !== attrs.views) changed.push("attrs.views");
    if (prev.title !== attrs.title) changed.push("attrs.title");
    if (prev.onUpdateTitle !== onUpdateTitle) changed.push("onUpdateTitle");
    if (prev.updateAttributes !== updateAttributes)
      changed.push("updateAttributes");
    if (prev.updatePropertiesAsync !== updatePropertiesAsync)
      changed.push("updatePropertiesAsync");
    if (prev.source !== source) changed.push("source");
    if (changed.length) console.log("[useDatabase] changed:", changed);
    _dbg.current = {
      prop,
      ui,
      views: attrs.views,
      title: attrs.title,
      onUpdateTitle,
      updateAttributes,
      updatePropertiesAsync,
      source,
    };
  });

  // Memoize the assembled object so `db` keeps a stable identity across
  // renders. Without this, the spread builds a new object every render, which
  // re-renders every consumer (and, where a consumer feeds `db` back into an
  // effect/memo dep, spins an infinite render loop). `prop` and `ui` already
  // memoize their own members, so depending on those two plus the three attrs
  // fields is sufficient and correct.
  return useMemo(
    () => ({
      ...prop,
      ...ui,
      views: attrs.views,
      title: attrs.title,
      onUpdateTitle,
    }),
    [prop, ui, attrs.views, attrs.title, onUpdateTitle],
  );
}
