import { useCallback } from "react";
import type {
  ID,
  PropertyType,
  DatabaseProperty,
  DatabaseAttrs,
  DatabaseView,
  PropertyConfig,
} from "../types/types";
import type { FilterRule } from "../types/filter-types";

function defaultConfigFor(type: PropertyType): PropertyConfig {
  switch (type) {
    case "number":
      return { type: "number", format: "number" };
    case "select":
      return { type: "select", options: [] };
    case "multi_select":
      return { type: "multi_select", options: [] };
    case "status":
      return { type: "status", groups: [] };
    case "date":
      return {
        type: "date",
        format: "short",
        timeFormat: "12h",
        includeTime: false,
      };
    case "person":
      return {
        type: "person",
        limit: "no-limit",
        default: "no-default",
        notifications: "users-only",
      };
    case "formula":
      return { type: "formula", expression: "" };
    case "relation":
      return { type: "relation", targetDatabaseId: "", showOnTarget: false };
    case "rollup":
      return {
        type: "rollup",
        relationPropertyId: "",
        targetPropertyId: "",
        aggregation: "count",
      };
    default:
      // title, text, checkbox, url, email, phone, created_*, edited_* — config is just { type }
      return { type } as PropertyConfig;
  }
}
export function useDatabaseProperties(
  attrs: DatabaseAttrs,
  source: { properties: DatabaseProperty[] },
  updatePropertiesAsync: (properties: DatabaseProperty[]) => Promise<unknown>,
  updateView: (viewId: ID, patch: Partial<DatabaseView>) => void,
) {
  const properties = source.properties;

  const viewById = useCallback(
    (viewId: ID) => attrs.views.find((v) => v.id === viewId),
    [attrs.views],
  );

  // ── Property mutations → SOURCE ──────────────────────────────────────────

  const addProperty = useCallback(
    (type: PropertyType) =>
      updatePropertiesAsync([
        ...properties,
        {
          id: crypto.randomUUID(),
          name: type.charAt(0).toUpperCase() + type.slice(1),
          config: defaultConfigFor(type),
          width: 160,
        },
      ]),
    [properties, updatePropertiesAsync],
  );
  const deleteProperty = useCallback(
    (propertyId: ID) =>
      updatePropertiesAsync(properties.filter((p) => p.id !== propertyId)),
    [properties, updatePropertiesAsync],
  );

  const updateProperty = useCallback(
    (propertyId: ID, patch: Partial<Omit<DatabaseProperty, "id">>) =>
      updatePropertiesAsync(
        properties.map((p) => (p.id === propertyId ? { ...p, ...patch } : p)),
      ),
    [properties, updatePropertiesAsync],
  );

  const reorderProperties = useCallback(
    (orderedIds: ID[]) => {
      const byId = new Map(properties.map((p) => [p.id, p]));
      const next = orderedIds
        .map((id) => byId.get(id))
        .filter((p): p is DatabaseProperty => !!p);
      // keep any not in orderedIds at the end
      const rest = properties.filter((p) => !orderedIds.includes(p.id));
      return updatePropertiesAsync([...next, ...rest]);
    },
    [properties, updatePropertiesAsync],
  );

  const duplicateProperty = useCallback(
    (propertyId: ID) => {
      const idx = properties.findIndex((p) => p.id === propertyId);
      if (idx < 0) return Promise.resolve();
      const orig = properties[idx];
      const copy: DatabaseProperty = {
        ...orig,
        id: crypto.randomUUID(),
        name: `${orig.name} copy`,
      };
      const next = [...properties];
      next.splice(idx + 1, 0, copy);
      return updatePropertiesAsync(next);
    },
    [properties, updatePropertiesAsync],
  );

  // ── View operations → NODE (via updateView) ──────────────────────────────
  const freezeProperty = useCallback(
    (viewId: ID, propertyId: ID | null) =>
      updateView(viewId, {
        frozenPropertyId: propertyId,
      } as Partial<DatabaseView>),
    [updateView],
  );

  const toggleUnwrapProperty = useCallback(
    (viewId: ID, propertyId: ID) => {
      const view = viewById(viewId) as
        | { unwrappedProperties?: ID[] }
        | undefined;
      const cur = view?.unwrappedProperties ?? [];
      const next = cur.includes(propertyId)
        ? cur.filter((id) => id !== propertyId)
        : [...cur, propertyId];
      updateView(viewId, {
        unwrappedProperties: next,
      } as Partial<DatabaseView>);
    },
    [updateView, viewById],
  );

  const hideProperty = useCallback(
    (viewId: ID, propertyId: ID) => {
      const view = viewById(viewId);
      const cur = view?.hiddenProperties ?? [];
      if (cur.includes(propertyId)) return;
      updateView(viewId, { hiddenProperties: [...cur, propertyId] });
    },
    [updateView, viewById],
  );

  const showProperty = useCallback(
    (viewId: ID, propertyId: ID) => {
      const view = viewById(viewId);
      const cur = view?.hiddenProperties ?? [];
      updateView(viewId, {
        hiddenProperties: cur.filter((id) => id !== propertyId),
      });
    },
    [updateView, viewById],
  );

  const sortByProperty = useCallback(
    (viewId: ID, propertyId: ID, direction: "asc" | "desc") => {
      const view = viewById(viewId);
      const sorts = (view?.sorts ?? []).filter(
        (s) => s.propertyId !== propertyId,
      );
      updateView(viewId, {
        sorts: [...sorts, { id: crypto.randomUUID(), propertyId, direction }],
      });
      // NO sortDatabaseRecords — sorting happens at render from view.sorts
    },
    [updateView, viewById],
  );

  const removeSortByProperty = useCallback(
    (viewId: ID, propertyId: ID) => {
      const view = viewById(viewId);
      updateView(viewId, {
        sorts: (view?.sorts ?? []).filter((s) => s.propertyId !== propertyId),
      });
    },
    [updateView, viewById],
  );

  const filterByProperty = useCallback(
    (viewId: ID, rule: FilterRule) => {
      const view = viewById(viewId);
      const groups = view?.filters ?? [];
      // append to first group, or create one (mirror your existing filter shape)
      const next =
        groups.length > 0
          ? groups.map((g, i) =>
              i === 0 ? { ...g, rules: [...g.rules, rule] } : g,
            )
          : [{ id: crypto.randomUUID(), op: "and", rules: [rule] }];
      updateView(viewId, { filters: next as DatabaseView["filters"] });
    },
    [updateView, viewById],
  );

  const groupByProperty = useCallback(
    (viewId: ID, propertyId: ID) =>
      updateView(viewId, {
        groupByPropertyId: propertyId,
      } as Partial<DatabaseView>),
    [updateView],
  );

  // ── Read helpers → read attrs directly, no doc walk ──────────────────────
  const isFrozen = useCallback(
    (viewId: ID, propertyId: ID) =>
      (viewById(viewId) as { frozenPropertyId?: ID } | undefined)
        ?.frozenPropertyId === propertyId,
    [viewById],
  );

  const isUnwrapped = useCallback(
    (viewId: ID, propertyId: ID) =>
      !!(
        viewById(viewId) as { unwrappedProperties?: ID[] } | undefined
      )?.unwrappedProperties?.includes(propertyId),
    [viewById],
  );

  return {
    addProperty,
    deleteProperty,
    updateProperty,
    reorderProperties,
    duplicateProperty,
    freezeProperty,
    toggleUnwrapProperty,
    hideProperty,
    showProperty,
    sortByProperty,
    removeSortByProperty,
    filterByProperty,
    groupByProperty,
    isFrozen,
    isUnwrapped,
  };
}
