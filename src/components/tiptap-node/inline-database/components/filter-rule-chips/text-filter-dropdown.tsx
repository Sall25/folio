import { FilterRuleHeader } from "./filter-rule-header";
import { FilterValueInput } from "./filter-value-input";
import { NO_VALUE_OPERATORS } from "src/types";
import type { DatabaseProperty, ID } from "src/types";
import type { FilterRule } from "src/types/filter-types";
import "./text-filter-dropdown.scss";

export function TextFilterDropdown({
  property,
  rule,
  onUpdate,
  onDelete,
  onPromote,
}: {
  property: DatabaseProperty;
  rule: FilterRule;
  onUpdate: (id: ID, patch: Partial<FilterRule>) => void;
  onDelete: (id: ID) => void;
  onPromote: () => void;
}) {
  // is_empty / is_not_empty (and checkbox ops) take no value — hide the input.
  const needsValue = !NO_VALUE_OPERATORS.has(rule.operator);

  return (
    <div className="text-filter-dropdown">
      <FilterRuleHeader
        propertyName={property.name}
        rule={rule}
        onChange={(patch) => onUpdate(rule.id, patch)}
        onDelete={() => onDelete(rule.id)}
        onPromote={onPromote}
      />

      {needsValue && (
        <div className="text-filter-dropdown__value">
          <FilterValueInput
            rule={rule}
            property={property}
            onChange={(patch) => onUpdate(rule.id, patch)}
          />
        </div>
      )}
    </div>
  );
}
