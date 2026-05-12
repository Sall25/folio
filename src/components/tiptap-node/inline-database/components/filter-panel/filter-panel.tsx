/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plus, Trash2 } from "lucide-react";
import type {
  DatabaseProperty,
  DatabaseView,
} from "../../types/types";
import type { FilterOperator, FilterRule, FilterGroup } from "../../types/filter-types";
import { getTypeMeta } from "../../types/config";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

// ─────────────────────────────────────────────────────────────────────────────
// Operator labels per property type
// ─────────────────────────────────────────────────────────────────────────────

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  is_empty: "is empty",
  is_not_empty: "is not empty",
  equals: "is",
  contains: "contains",
  not_contains: "does not contain",
  starts_with: "starts with",
  ends_with: "ends with",
  greater_than: "greater than",
  greater_than_or_equal: "greater than or equal to",
  less_than: "less than",
  less_than_or_equal: "less than or equal to",
  is_before: "is before",
  is_after: "is after",
  is_on_or_before: "is on or before",
  is_on_or_after: "is on or after",
  is_within: "is within",
  is_checked: "is checked",
  is_unchecked: "is unchecked",
};

const NO_VALUE_OPERATORS: FilterOperator[] = [
  "is_empty",
  "is_not_empty",
  "is_checked",
  "is_unchecked",
];

function makeId(): string {
  return crypto.randomUUID();
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter rule row
// ─────────────────────────────────────────────────────────────────────────────

interface FilterRuleRowProps {
  rule: FilterRule;
  properties: DatabaseProperty[];
  conjunction: "and" | "or";
  isFirst: boolean;
  onChange: (updated: FilterRule) => void;
  onDelete: () => void;
}

function FilterRuleRow({
  rule,
  properties,
  conjunction,
  isFirst,
  onChange,
  onDelete,
}: FilterRuleRowProps) {
  const property =
    properties.find((p) => p.id === rule.propertyId) ?? properties[0];
  const meta = getTypeMeta(property.config.type);
  const operators = meta.filterOperators;
  const needsValue = !NO_VALUE_OPERATORS.includes(rule.operator);

  const renderValueInput = () => {
    if (!needsValue) return null;

    switch (property.config.type) {
      case "select":
      case "multi_select": {
        const options = (property.config as any).options ?? [];
        return (
          <select
            className="fp-select"
            value={String(rule.value ?? "")}
            onChange={(e) => onChange({ ...rule, value: e.target.value as any })}
          >
            <option value="">Select...</option>
            {options.map((o: any) => (
              <option key={o.id} value={o.name}>
                {o.name}
              </option>
            ))}
          </select>
        );
      }
      case "status": {
        const allItems =
          (property.config as any).groups?.flatMap((g: any) => g.items) ?? [];
        return (
          <select
            className="fp-select"
            value={String(rule.value ?? "")}
            onChange={(e) => onChange({ ...rule, value: e.target.value as any })}
          >
            <option value="">Select...</option>
            {allItems.map((i: any) => (
              <option key={i.id} value={i.name}>
                {i.name}
              </option>
            ))}
          </select>
        );
      }
      case "number":
        return (
          <input
            className="fp-input"
            type="number"
            placeholder="Value"
            value={rule.value === null ? "" : String(rule.value ?? "")}
            onChange={(e) =>
              onChange({
                ...rule,
                value: e.target.value === "" ? null : e.target.value as any,
              })
            }
          />
        );
      case "date":
      case "created_time":
      case "edited_time":
        return (
          <input
            className="fp-input"
            type="date"
            value={String(rule.value ?? "")}
            onChange={(e) => onChange({ ...rule, value: e.target.value as any })}
          />
        );
      case "checkbox":
        return null;
      default:
        return (
          <input
            className="fp-input"
            placeholder="Value"
            value={String(rule.value ?? "")}
            onChange={(e) => onChange({ ...rule, value: e.target.value as any})}
          />
        );
    }
  };

  return (
    <CardItemGroup orientation="horizontal">
      {/* Conjunction label */}
      <span className="fp-conjunction">
        {isFirst ? "Where" : conjunction.toUpperCase()}
      </span>
      <br />

      {/* Property selector */}
      <select
        className="fp-select"
        value={rule.propertyId}
        onChange={(e) => {
          const prop = properties.find((p) => p.id === e.target.value)!;
          const newMeta = getTypeMeta(prop.config.type);
          onChange({
            ...rule,
            propertyId: e.target.value,
            operator: newMeta.filterOperators[0],
            value: undefined,
          } as any);
        }}
      >
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {/* Operator selector */}
      <select
        className="fp-select"
        value={rule.operator}
        onChange={(e) =>
          onChange({
            ...rule,
            operator: e.target.value as FilterOperator,
            value: undefined,
          } as any)
        }
      >
        {operators.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op]}
          </option>
        ))}
      </select>

      {/* Value input */}
      {renderValueInput()}

      <Spacer orientation="horizontal" />

      {/* Delete */}
      <Button
        className="fp-delete-btn"
        onClick={onDelete}
        aria-label="Remove filter"
      >
        <Trash2 style={{ width: 12, height: 12 }} />
      </Button>
    </CardItemGroup>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter group
// ─────────────────────────────────────────────────────────────────────────────

interface FilterGroupBlockProps {
  group: FilterGroup;
  properties: DatabaseProperty[];
  isFirst: boolean;
  onChange: (updated: FilterGroup) => void;
  onDelete: () => void;
}

function FilterGroupBlock({
  group,
  properties,
  isFirst,
  onChange,
  /*  onDelete,*/
}: FilterGroupBlockProps) {
  const addRule = () => {
    const prop = properties[0];
    const meta = getTypeMeta(prop.config.type);
    const newRule: FilterRule = {
      id: makeId(),
      propertyId: prop.id,
      operator: meta.filterOperators[0] as any,
      value: undefined,
    } as any;
    onChange({ ...group, rules: [...group.rules, newRule] });
  };

  const updateRule = (ruleId: string, updated: FilterRule) =>
    onChange({
      ...group,
      rules: group.rules.map((r) => (r.id === ruleId ? updated : r)),
    });

  const deleteRule = (ruleId: string) =>
    onChange({ ...group, rules: group.rules.filter((r) => r.id !== ruleId) });

  // className="fp-group"
  return (
    <div>
      {!isFirst && (
        <div className="fp-group-separator">
          <span className="fp-group-sep-label">OR</span>
        </div>
      )}

      <div className="fp-group-body" style={{ background: "transparent" }}>
        {group.rules.map((rule, i) => (
          <FilterRuleRow
            key={rule.id}
            rule={rule}
            properties={properties}
            conjunction={group.conjunction}
            isFirst={i === 0}
            onChange={(updated) => updateRule(rule.id, updated)}
            onDelete={() => deleteRule(rule.id)}
          />
        ))}

        <div className="fp-group-actions">
          <Button
            variant="ghost"
            style={{
              height: 22,
              gap: 5,
              fontSize: 12,
              background: "var(--tt-brand-color-400)",
              borderRadius: "var(--tt-radius-sm)",
            }}
            onClick={addRule}
          >
            <Plus
              style={{ width: 12, height: 12, color: "white" }}
              className="tiptap-button-icon"
            />
            <span className="tiptap-button-text" style={{ color: "white" }}>
              {" "}
              Add a filter
            </span>
          </Button>

          {/* Toggle AND/OR within group */}
          <Button
            variant="ghost"
            style={{
              height: 22,
              gap: 5,
              fontSize: 12,
              background: "var(--tt-color-highlight-yellow)",
              borderRadius: "var(--tt-radius-sm)",
            }}
            onClick={() =>
              onChange({
                ...group,
                conjunction: group.conjunction === "and" ? "or" : "and",
              })
            }
          >
            {group.conjunction === "and" ? "Switch to OR" : "Switch to AND"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FilterPanel
// ─────────────────────────────────────────────────────────────────────────────

interface FilterPanelProps {
  view: DatabaseView;
  properties: DatabaseProperty[];
  onUpdateView: (patch: Partial<Omit<DatabaseView, "id" | "type">>) => void;
}

export function FilterPanel({
  view,
  properties,
  onUpdateView,
}: FilterPanelProps) {
  const filters = view.filters;

  const addGroup = () => {
    const prop = properties[0];
    const meta = getTypeMeta(prop.config.type);
    const newGroup: FilterGroup = {
      id: makeId(),
      conjunction: "and",
      rules: [
        {
          id: makeId(),
          propertyId: prop.id,
          operator: meta.filterOperators[0],
          value: undefined,
        },
      ],
    };
    onUpdateView({ filters: [...filters, newGroup] });
  };

  const updateGroup = (groupId: string, updated: FilterGroup) =>
    onUpdateView({
      filters: filters.map((g) => (g.id === groupId ? updated : g)),
    });

  const deleteGroup = (groupId: string) =>
    onUpdateView({ filters: filters.filter((g) => g.id !== groupId) });

  return (
    <Card>
      <CardBody style={{ minWidth: 280, maxWidth: 500 }}>
        <CardItemGroup>
          {filters.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: "var(--tt-text-color)",
                padding: "4px 8px",
                opacity: 0.6,
              }}
            >
              No filters applied to this view.
            </p>
          ) : (
            filters.map((group, i) => (
              <FilterGroupBlock
                key={group.id}
                group={group}
                properties={properties}
                isFirst={i === 0}
                onChange={(updated) => updateGroup(group.id, updated)}
                onDelete={() => deleteGroup(group.id)}
              />
            ))
          )}

          <Button
            variant="ghost"
            style={{
              height: 28,
              gap: 6,
              fontSize: 13,
              justifyContent: "flex-start",
              borderRadius: "var(--tt-radius-sm)",
              marginTop: 15,
            }}
            onClick={addGroup}
          >
            <Plus
              style={{ width: 13, height: 13 }}
              className="tiptap-button-icon"
            />
            {filters.length === 0 ? "Add a filter" : "Add filter group"}
          </Button>
        </CardItemGroup>
      </CardBody>
    </Card>
  );
}
