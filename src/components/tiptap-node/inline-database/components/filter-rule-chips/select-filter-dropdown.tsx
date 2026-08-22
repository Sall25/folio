import { useMemo, useState } from "react";
import { pillClass } from "../../utils/pill-colors";
import type { DatabaseProperty, ID, SelectOption } from "src/types";
import type {
  SelectFilterRule,
  MultiSelectFilterRule,
} from "src/types/filter-types";
import "./select-filter-dropdown.scss";
import { FilterRuleHeader } from "./filter-rule-header";

type SelectRule = SelectFilterRule | MultiSelectFilterRule;

export function SelectFilterDropdown({
  property,
  rule,
  onUpdate,
  onDelete,
  onPromote,
}: {
  property: DatabaseProperty;
  rule: SelectRule;
  onUpdate: (id: ID, patch: Partial<SelectRule>) => void;
  onDelete: (id: ID) => void;
  onPromote: () => void;
}) {
  const options: SelectOption[] = useMemo(() => {
    if (
      property.config.type === "select" ||
      property.config.type === "multi_select"
    ) {
      return property.config.options ?? [];
    }
    return [];
  }, [property]);

  const selectedIds = useMemo(() => new Set(rule.value ?? []), [rule.value]);

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options;
  }, [options, search]);

  // keep value[] (ids) and labels[] in lockstep, storing only ids that resolve
  function commit(nextIds: string[]) {
    const resolved = nextIds
      .map((id) => options.find((o) => o.id === id))
      .filter((o): o is SelectOption => o != null);
    onUpdate(rule.id, {
      value: resolved.map((o) => o.id),
      labels: resolved.map((o) => o.label),
    } as Partial<SelectRule>);
  }

  function toggle(optionId: string) {
    const next = selectedIds.has(optionId)
      ? (rule.value ?? []).filter((id) => id !== optionId)
      : [...(rule.value ?? []), optionId];
    commit(next);
  }

  return (
    <div className="select-filter-dropdown">
      <FilterRuleHeader
        propertyName={property.name}
        rule={rule}
        onChange={(patch) => onUpdate(rule.id, patch as Partial<SelectRule>)}
        onDelete={() => onDelete(rule.id)}
        onPromote={onPromote}
      />
      <input
        className="select-filter-dropdown__search"
        placeholder="Select one or more options..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />

      <div className="select-filter-dropdown__list">
        {filtered.length === 0 && (
          <span className="select-filter-dropdown__empty">
            No options found
          </span>
        )}
        {filtered.map((option) => (
          <button
            type="button"
            key={option.id}
            className="select-filter-dropdown__row"
            onClick={() => toggle(option.id)}
          >
            <span
              className="select-filter-dropdown__checkbox"
              data-checked={selectedIds.has(option.id) || undefined}
              aria-hidden
            />
            <span className={pillClass("select-badge", option.color)}>
              <span className="select-badge__label">{option.label}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
