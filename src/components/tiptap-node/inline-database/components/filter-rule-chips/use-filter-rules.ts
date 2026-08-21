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
  function saveGroup(updated: FilterGroup) {
    if (!viewId) return;
    db.updateView(viewId, { filters: [updated] });
  }

  function addRule() {
    const firstProp = properties[0];
    if (!firstProp) return;
    saveGroup({ ...group, rules: [...rules, makeFilterRule(firstProp)] });
  }

  function updateRule(id: ID, patch: Partial<FilterRule>) {
    console.log("updateRule: [patch]", patch);
    saveGroup({
      ...group,
      rules: rules.map((r) =>
        r.id === id ? { ...r, ...patch } : r,
      ) as FilterGroup["rules"],
    });
  }

  function deleteRule(id: ID) {
    saveGroup({ ...group, rules: rules.filter((r) => r.id !== id) });
  }

  // A new property type means a different operator set and value shape, so we
  // rebuild the rule rather than patch (patching would leave an operator the
  // new type doesn't support).
  function changeProperty(id: ID, propertyId: ID) {
    const newProp = properties.find((p) => p.id === propertyId);
    if (!newProp) return;
    updateRule(id, makeFilterRule(newProp));
  }

  function setGroupOperator(op: FilterGroupOperator) {
    saveGroup({ ...group, operator: op });
  }

  function clearRules() {
    saveGroup({ ...group, rules: [] });
  }

  return {
    addRule,
    updateRule,
    deleteRule,
    changeProperty,
    setGroupOperator,
    clearRules,
  };
}
