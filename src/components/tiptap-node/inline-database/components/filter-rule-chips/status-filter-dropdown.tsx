import { useMemo } from "react";
import { StatusPill } from "../../ui/status/status-edit-display";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import type { DatabaseProperty, ID, StatusGroup, StatusItem } from "src/types";
import type { StatusFilterRule } from "src/types/filter-types";
import "./status-filter-dropdown.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { GroupIcon } from "./group-icon";
import { FilterRuleHeader } from "./filter-rule-header";

const EMPTY_STATUS_GROUPS: StatusGroup[] = [];

export function StatusFilterDropdown({
  property,
  rule,
  onUpdate,
  onDelete,
  onPromote,
}: {
  property: DatabaseProperty;
  rule: StatusFilterRule;
  onUpdate: (id: ID, patch: Partial<StatusFilterRule>) => void;
  onDelete: (id: ID) => void;
  onPromote: () => void;
}) {
  const groups =
    property.config.type === "status"
      ? property.config.groups
      : EMPTY_STATUS_GROUPS;

  // All items flattened — used to rebuild labels[] from ids after any change.
  const allItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const selectedIds = useMemo(() => new Set(rule.value ?? []), [rule.value]);

  console.log("SELECTED IDS", selectedIds);

  // Rebuild value[] + the derived labels[] from a new id set. labels is display-
  // only and always derived from ids, so the two can never drift apart.
  function commit(nextIds: string[]) {
    // Keep only ids that resolve to a real item — drops stale/unknown ids so
    // value[] and labels[] stay consistent and no empty labels leak through.
    const resolved = nextIds
      .map((id) => allItems.find((it) => it.id === id))
      .filter((it): it is StatusItem => it != null);

    console.log("NEXT IDS", nextIds);

    onUpdate(rule.id, {
      value: resolved.map((it) => it.id),
      labels: resolved.map((it) => it.name),
    });
  }

  function toggleItem(itemId: string) {
    const next = selectedIds.has(itemId)
      ? (rule.value ?? []).filter((id) => id !== itemId)
      : [...(rule.value ?? []), itemId];
    commit(next);
  }

  function toggleGroup(groupItemIds: string[]) {
    const allSelected = groupItemIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      // deselect every item in this group
      commit((rule.value ?? []).filter((id) => !groupItemIds.includes(id)));
    } else {
      // add any of this group's items not already selected
      const merged = new Set([...(rule.value ?? []), ...groupItemIds]);
      commit([...merged]);
    }
  }

  function clearSelection() {
    commit([]);
  }

  return (
    <div className="status-filter-dropdown">
      <FilterRuleHeader
        propertyName={property.name}
        rule={rule}
        onChange={(patch) =>
          onUpdate(rule.id, patch as Partial<StatusFilterRule>)
        }
        onDelete={() => onDelete(rule.id)}
        onPromote={onPromote}
      />
      {groups.map((group) => {
        const groupItemIds = group.items.map((it) => it.id);
        const groupChecked =
          groupItemIds.length > 0 &&
          groupItemIds.every((id) => selectedIds.has(id));
        const groupPartial =
          !groupChecked && groupItemIds.some((id) => selectedIds.has(id));

        return (
          <div key={group.id} className="status-filter-dropdown__group">
            {/* Group header — its checkbox toggles the whole group */}
            <Button
              variant="ghost"
              type="button"
              className="status-filter-dropdown__group-header"
              onClick={() => toggleGroup(groupItemIds)}
            >
              <span
                className="status-filter-dropdown__checkbox"
                data-checked={groupChecked || undefined}
                data-partial={groupPartial || undefined}
                aria-hidden
              />
              <GroupIcon group={group} />
              <span className="status-filter-dropdown__group-name">
                {group.label}
              </span>
            </Button>

            {/* Items in the group */}
            {group.items.map((item) => (
              <button
                type="button"
                key={item.id}
                className="status-filter-dropdown__row"
                onClick={() => toggleItem(item.id)}
              >
                <span
                  className="status-filter-dropdown__checkbox"
                  data-checked={selectedIds.has(item.id) || undefined}
                  aria-hidden
                />
                <StatusPill name={item.name} color={item.color} />
              </button>
            ))}
          </div>
        );
      })}

      <Separator orientation="horizontal" style={{ height: 0.5 }} />

      <Button
        type="button"
        variant="ghost"
        className="tiptap-button-delete"
        onClick={clearSelection}
      >
        <span className="tiptap-button-text">Clear selection</span>
      </Button>
    </div>
  );
}
