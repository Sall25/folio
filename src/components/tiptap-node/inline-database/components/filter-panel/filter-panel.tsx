import { nanoid } from "nanoid";
import { Plus, X, GripVertical } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardFooter,
  CardHeader,
  CardBody,
  CardGroupLabel,
} from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import type {
  DatabaseAttrs,
  DatabaseProperty,
  ID,
  PropertyConfig,
} from "../../types/types";
import type { UseDatabaseReturn } from "../../hooks/use-database";
import type {
  FilterGroup,
  FilterGroupOperator,
  FilterOperator,
  FilterRule,
} from "../../types/filter-types";
import {
  OPERATORS_FOR_TYPE,
  OPERATOR_LABEL,
  NO_VALUE_OPERATORS,
} from "../../types/filter-types";
import { PROPERTY_TYPE_ICONS } from "../../types/property-type-meta";
import type { DatabaseView } from "../../types/types";
import "./filter-panel.scss";
import type { SelectionOptions } from "@tiptap/extensions";

// ── makeFilterRule ─────────────────────────────────────────────────────────

function makeFilterRule(property: DatabaseProperty): FilterRule {
  const type = property.config.type;
  const operator = OPERATORS_FOR_TYPE[type]?.[0];
  switch (type) {
    case "number":
      return {
        id: nanoid(),
        propertyId: property.id,
        propertyType: type,
        operator: operator as never,
        value: 0,
      };
    case "checkbox":
      return {
        id: nanoid(),
        propertyId: property.id,
        propertyType: "checkbox",
        operator: "is_checked",
      };
    case "date":
    case "created_time":
    case "edited_time":
      return {
        id: nanoid(),
        propertyId: property.id,
        propertyType: type,
        operator: operator as never,
        value: null,
      };
    case "select":
      return {
        id: nanoid(),
        propertyId: property.id,
        propertyType: "select",
        operator: "is",
        value: "",
      };
    case "multi_select":
      return {
        id: nanoid(),
        propertyId: property.id,
        propertyType: "multi_select",
        operator: "contains",
        value: "",
      };
    case "status":
      return {
        id: nanoid(),
        propertyId: property.id,
        propertyType: "status",
        operator: "is",
        value: "",
      };
    case "relation":
      return {
        id: nanoid(),
        propertyId: property.id,
        propertyType: "relation",
        operator: "contains",
        value: "",
      };
    case "formula":
      return {
        id: nanoid(),
        propertyId: property.id,
        propertyType: "formula",
        operator: "contains",
        value: "",
      };
    case "person":
    case "created_by":
    case "edited_by":
      return {
        id: nanoid(),
        propertyId: property.id,
        propertyType: type,
        operator: "contains",
        value: "",
      };
    default:
      return {
        id: nanoid(),
        propertyId: property.id,
        propertyType: type as "title",
        operator: "contains",
        value: "",
      };
  }
}

// ── FilterValueInput ───────────────────────────────────────────────────────

function FilterValueInput({
  rule,
  property,
  onChange,
}: {
  rule: FilterRule;
  property: DatabaseProperty;
  onChange: (patch: Partial<FilterRule>) => void;
}) {
  const config = property.config;
  const type = rule.propertyType;

  if (type === "select" || type === "multi_select") {
    const options =
      "options" in config
        ? (config as Extract<
            PropertyConfig,
            { options: SelectionOptions[] }
          >) /*.options*/
        : [];
    return (
      <select
        className="db-select"
        value={(rule.value as string) ?? ""}
        onChange={(e) =>
          onChange({ value: e.target.value } as Partial<FilterRule>)
        }
      >
        <option value="">Select an option</option>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {options.map((o: any) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (type === "status") {
    const groups =
      "groups" in config
        ? (config as { groups: { items: { id: ID; name: string }[] }[] }).groups
        : [];
    const options = groups.flatMap((g) => g.items);
    return (
      <select
        className="db-select"
        value={(rule.value as string) ?? ""}
        onChange={(e) =>
          onChange({ value: e.target.value } as Partial<FilterRule>)
        }
      >
        <option value="">Select a status</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    );
  }

  if (type === "number") {
    return (
      <input
        className="db-input"
        type="number"
        value={(rule.value as number) ?? ""}
        onChange={(e) =>
          onChange({
            value: e.target.value === "" ? 0 : Number(e.target.value),
          } as Partial<FilterRule>)
        }
        placeholder="Value"
      />
    );
  }

  if (type === "date" || type === "created_time" || type === "edited_time") {
    if (rule.operator === "is_within") {
      const withinOptions = [
        { value: "past_week", label: "Past week" },
        { value: "past_month", label: "Past month" },
        { value: "past_year", label: "Past year" },
        { value: "next_week", label: "Next week" },
        { value: "next_month", label: "Next month" },
        { value: "next_year", label: "Next year" },
        { value: "the_past_7_days", label: "The past 7 days" },
        { value: "the_past_30_days", label: "The past 30 days" },
      ];
      return (
        <select
          className="db-select"
          value={(rule.value as string) ?? ""}
          onChange={(e) =>
            onChange({ value: e.target.value } as Partial<FilterRule>)
          }
        >
          {withinOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        className="db-input"
        type="date"
        value={(rule.value as string) ?? ""}
        onChange={(e) =>
          onChange({ value: e.target.value } as Partial<FilterRule>)
        }
      />
    );
  }

  return (
    <input
      className="db-input"
      type="text"
      value={(rule.value as string) ?? ""}
      onChange={(e) =>
        onChange({ value: e.target.value } as Partial<FilterRule>)
      }
      placeholder="Value"
    />
  );
}

// ── FilterRuleRow ──────────────────────────────────────────────────────────

function FilterRuleRow({
  rule,
  index,
  groupOperator,
  properties,
  onChange,
  onDelete,
  onPropertyChange,
}: {
  rule: FilterRule;
  index: number;
  groupOperator: FilterGroupOperator;
  properties: DatabaseProperty[];
  onChange: (patch: Partial<FilterRule>) => void;
  onDelete: () => void;
  onPropertyChange: (propertyId: ID) => void;
}) {
  const property = properties.find((p) => p.id === rule.propertyId);
  const Icon = property ? PROPERTY_TYPE_ICONS[property.config.type] : null;
  const operators = OPERATORS_FOR_TYPE[rule.propertyType] as FilterOperator[];
  const needsValue = !NO_VALUE_OPERATORS.has(rule.operator);

  return (
    <div className="db-filter-rule">
      <GripVertical size={13} className="db-filter-rule__drag" />
      <span className="db-filter-rule__conjunction">
        {index === 0 ? "Where" : groupOperator}
      </span>

      <Popover>
        <PopoverTrigger asChild>
          <button className="db-filter-rule__btn db-filter-rule__btn--property">
            {Icon && <Icon size={12} />}
            <span>{property?.name ?? "Property"}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="db-panel">
          <Card
            style={{ padding: "5px 10px", minWidth: 180, boxShadow: "none" }}
          >
            <CardItemGroup>
              {properties.map((p) => {
                const PIcon = PROPERTY_TYPE_ICONS[p.config.type];
                return (
                  <Button
                    key={p.id}
                    variant="ghost"
                    style={{
                      justifyContent: "flex-start",
                      width: "100%",
                      fontWeight: p.id === rule.propertyId ? 600 : 400,
                      minHeight: "20px !important",
                      height: "20px !important",
                    }}
                    onClick={() => onPropertyChange(p.id)}
                  >
                    <PIcon size={13} className="tiptap-button-icon" />
                    <span className="tiptap-button-text">{p.name}</span>
                  </Button>
                );
              })}
            </CardItemGroup>
          </Card>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <button className="db-filter-rule__btn db-filter-rule__btn--operator">
            {OPERATOR_LABEL[rule.operator]}
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="db-panel">
          <Card style={{ padding: "5px 10px", minWidth: 160 }}>
            <CardItemGroup>
              {operators.map((op) => (
                <Button
                  key={op}
                  variant="ghost"
                  style={{
                    justifyContent: "flex-start",
                    width: "100%",
                    fontWeight: op === rule.operator ? 600 : 400,
                    minHeight: 22,
                    height: 22,
                  }}
                  onClick={() =>
                    onChange({ operator: op } as Partial<FilterRule>)
                  }
                >
                  <span className="tiptap-button-text">
                    {OPERATOR_LABEL[op]}
                  </span>
                </Button>
              ))}
            </CardItemGroup>
          </Card>
        </PopoverContent>
      </Popover>

      {needsValue && property && (
        <div className="db-filter-rule__value">
          <FilterValueInput
            rule={rule}
            property={property}
            onChange={onChange}
          />
        </div>
      )}

      <button className="db-filter-rule__delete" onClick={onDelete}>
        <X size={12} />
      </button>
    </div>
  );
}

// ── FilterPanel ────────────────────────────────────────────────────────────

export function FilterPanel({
  attrs,
  db,
  activeView,
}: {
  attrs: DatabaseAttrs;
  db: UseDatabaseReturn;
  activeView: DatabaseView | undefined;
}) {
  if (!activeView) return null;

  const group: FilterGroup = activeView.filters[0] ?? {
    id: nanoid(),
    operator: "and" as FilterGroupOperator,
    rules: [],
  };
  const rules = group.rules as FilterRule[];

  function saveGroup(updated: FilterGroup) {
    db.updateView(activeView!.id, { filters: [updated] });
  }

  function addRule() {
    const firstProp = attrs.properties[0];
    console.log("addRule");
    if (!firstProp) return;

    const newRule = makeFilterRule(firstProp);
    const currentGroup: FilterGroup = activeView?.filters[0] ?? {
      id: nanoid(),
      operator: "and" as FilterGroupOperator,
      rules: [],
    };
    saveGroup({
      ...currentGroup,
      rules: [...(currentGroup.rules as FilterRule[]), newRule],
    });
  }

  function updateOperator(operator: FilterGroupOperator) {
    saveGroup({ ...group, operator });
  }

  function updateRule(id: ID, patch: Partial<FilterRule>) {
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

  return (
    <Card className="db-filter-panel">
      <CardHeader>
        {rules.length === 0 ? (
          <span className="db-panel__empty">
            No filters applied to this view
          </span>
        ) : (
          <CardGroupLabel>Filters</CardGroupLabel>
        )}
        {rules.length > 1 && (
          <div className="db-filter-panel__conjunction-row">
            <span className="db-filter-panel__conjunction-label">
              In this view, show records where
            </span>
            <div className="db-filter-panel__conjunction-toggle">
              {(["and", "or"] as const).map((op) => (
                <button
                  key={op}
                  className={`db-filter-panel__conj-btn ${group.operator === op ? "db-filter-panel__conj-btn--active" : ""}`}
                  onClick={() => updateOperator(op)}
                >
                  {op}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardHeader>

      {rules.length > 0 && (
        <CardBody>
          {rules.map((rule, i) => (
            <FilterRuleRow
              key={rule.id}
              rule={rule}
              index={i}
              groupOperator={group.operator}
              properties={attrs.properties}
              onChange={(patch) => updateRule(rule.id, patch)}
              onDelete={() => deleteRule(rule.id)}
              onPropertyChange={(propertyId) => {
                const newProp = attrs.properties.find(
                  (p) => p.id === propertyId,
                );
                if (!newProp) return;
                updateRule(rule.id, makeFilterRule(newProp));
              }}
            />
          ))}
        </CardBody>
      )}

      <CardFooter style={{ width: "100%", padding: "5px 10px" }}>
        <Button
          variant="ghost"
          onClick={addRule}
          style={{
            justifyContent: "flex-start",
            width: "100%",
            borderRadius: "var(--tt-radius-sm)",
          }}
        >
          <Plus size={13} className="tiptap-button-icon" />
          <span className="tiptap-button-text">Add filter rule</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
