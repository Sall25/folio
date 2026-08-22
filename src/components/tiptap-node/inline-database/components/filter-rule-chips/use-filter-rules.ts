import type { DatabaseProperty, ID } from "src/types";
import type {
  FilterRule,
  FilterGroup,
  FilterGroupOperator,
} from "src/types/filter-types";
import { makeFilterRule } from "./utils";
import type { UseDatabaseReturn } from "../../hooks/use-database";

export function useFilterRules(
  db: UseDatabaseReturn,
  viewId: ID | undefined,
  group: FilterGroup,
  rules: FilterRule[],
  properties: DatabaseProperty[],
) {
  const allFilters = db.activeView?.filters ?? [];

  // Write `updated` back IN PLACE — replace the matching group by id, preserve
  // all sibling chips. The old `filters: [updated]` replaced the whole array,
  // wiping every other chip on any edit (and breaking toggling on non-first
  // chips).
  function saveGroup(updated: FilterGroup) {
    if (!viewId) return;
    const all = db.activeView?.filters ?? [];
    const exists = all.some((g) => g.id === updated.id);
    const next = exists
      ? all.map((g) => (g.id === updated.id ? updated : g))
      : [...all, updated];
    db.updateView(viewId, { filters: next });
  }

  function addRule() {
    const firstProp = properties[0];
    if (!firstProp) return;
    saveGroup({ ...group, rules: [...rules, makeFilterRule(firstProp)] });
  }

  function updateRule(id: ID, patch: Partial<FilterRule>) {
    saveGroup({
      ...group,
      rules: rules.map((r) =>
        r.id === id ? ({ ...r, ...patch } as FilterRule) : r,
      ),
    });
    console.log("UPDATE RULE");
  }

  function deleteRule(id: ID) {
    saveGroup({ ...group, rules: rules.filter((r) => r.id !== id) });
  }

  function changeProperty(id: ID, propertyId: ID) {
    const newProp = properties.find((p) => p.id === propertyId);
    if (!newProp) return;
    saveGroup({
      ...group,
      rules: rules.map((r) => (r.id === id ? makeFilterRule(newProp) : r)),
    });
  }

  function setGroupOperator(op: FilterGroupOperator) {
    saveGroup({ ...group, operator: op });
  }

  function clearRules() {
    // "Delete filter" on a chip = remove THIS group from the view entirely.
    if (!viewId) return;
    db.updateView(viewId, {
      filters: allFilters.filter((g) => g.id !== group.id),
    });
  }

  function promoteToAdvanced() {
    saveGroup({ ...group, advanced: true });
  }

  return {
    addRule,
    updateRule,
    deleteRule,
    changeProperty,
    setGroupOperator,
    clearRules,
    promoteToAdvanced,
  };
}

/**
 * export function useFilterRules(
  db: DatabaseController,
  viewId: ID | undefined,
  group: FilterGroup,          // the SPECIFIC group this chip edits
  rules: FilterRule[],
  properties: DatabaseProperty[],
) {
 
  function addRule() {
    const firstProp = properties[0];
    if (!firstProp) return;
    saveGroup({ ...group, rules: [...rules, makeFilterRule(firstProp)] });
  }

  function updateRule(id: ID, patch: Partial<FilterRule>) {
    saveGroup({
      ...group,
      rules: rules.map((r) => (r.id === id ? ({ ...r, ...patch } as FilterRule) : r)),
    });
  }

  function deleteRule(id: ID) {
    saveGroup({ ...group, rules: rules.filter((r) => r.id !== id) });
  }

  function changeProperty(id: ID, propertyId: ID) {
    const newProp = properties.find((p) => p.id === propertyId);
    if (!newProp) return;
    saveGroup({
      ...group,
      rules: rules.map((r) => (r.id === id ? makeFilterRule(newProp) : r)),
    });
  }

  function setGroupOperator(op: FilterGroupOperator) {
    saveGroup({ ...group, operator: op });
  }

  function clearRules() {
    // "Delete filter" on a chip = remove THIS group from the view entirely.
    if (!viewId) return;
    db.updateView(viewId, {
      filters: allFilters.filter((g) => g.id !== group.id),
    });
  }

  function promoteToAdvanced() {
    saveGroup({ ...group, advanced: true });
  }

  return {
    addRule, updateRule, deleteRule, changeProperty,
    setGroupOperator, clearRules, promoteToAdvanced,
  };
}
 */
