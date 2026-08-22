import { FilterRuleHeader } from "./filter-rule-header";
import { NO_VALUE_OPERATORS } from "src/types/filter-types";
import type { DatabaseProperty, ID } from "src/types";
import type { FilterRule } from "src/types/filter-types";
import "./date-filter-dropdown.scss";
import { useCallback } from "react";

// The relative ranges the matcher's is_within branch understands.
const WITHIN_RANGES: { value: string; label: string }[] = [
  { value: "the_past_7_days", label: "The past 7 days" },
  { value: "the_past_30_days", label: "The past 30 days" },
  { value: "past_week", label: "Past week" },
  { value: "past_month", label: "Past month" },
  { value: "past_year", label: "Past year" },
  { value: "next_week", label: "Next week" },
  { value: "next_month", label: "Next month" },
  { value: "next_year", label: "Next year" },
];

export function DateFilterDropdown({
  property,
  rule,
  onUpdate,
  onDelete: onDeleteProp,
  onPromote,
}: {
  property: DatabaseProperty;
  rule: FilterRule;
  onUpdate: (id: ID, patch: Partial<FilterRule>) => void;
  onDelete: (id: ID) => void;
  onPromote: () => void;
}) {
  const op = rule.operator;
  const needsValue = !NO_VALUE_OPERATORS.has(op);
  const isWithin = op === "is_within";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentValue = (rule as any).value as string | null | undefined;
  const onChange = useCallback(
    (patch: Partial<FilterRule>) => onUpdate(rule.id, patch),
    [rule.id, onUpdate],
  );
  const onDelete = useCallback(
    () => onDeleteProp(rule.id),
    [rule.id, onDeleteProp],
  );

  return (
    <div className="date-filter-dropdown">
      <FilterRuleHeader
        propertyName={property.name}
        rule={rule}
        onChange={onChange}
        onDelete={onDelete}
        onPromote={onPromote}
      />

      {needsValue && (
        <div className="date-filter-dropdown__value">
          {isWithin ? (
            // Relative range → keyword the matcher's is_within understands
            <div className="date-filter-dropdown__ranges">
              {WITHIN_RANGES.map((r) => (
                <button
                  type="button"
                  key={r.value}
                  className="date-filter-dropdown__range"
                  data-active={currentValue === r.value || undefined}
                  onClick={() =>
                    onUpdate(rule.id, { value: r.value } as Partial<FilterRule>)
                  }
                >
                  {r.label}
                </button>
              ))}
            </div>
          ) : (
            // Absolute date → an ISO yyyy-mm-dd string the matcher parses via new Date()
            <input
              type="date"
              className="date-filter-dropdown__date-input"
              value={toDateInputValue(currentValue)}
              onChange={(e) =>
                onUpdate(rule.id, {
                  value: e.target.value,
                } as Partial<FilterRule>)
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

// The matcher parses value with new Date(String(v)); a yyyy-mm-dd string from
// <input type="date"> parses cleanly, so store exactly that.
function toDateInputValue(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  // yyyy-mm-dd for the native date input
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
