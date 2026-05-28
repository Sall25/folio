import { nanoid } from "nanoid";
import { Plus, ChevronDown, Trash } from "lucide-react";
import {
  Card,
  CardFooter,
  CardGroupLabel,
} from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type {
  DatabaseAttrs,
  DatabaseProperty,
  DatabaseView,
  ID,
  PropertyConfig,
  SelectOption,
} from "../../types/types";
import type { UseDatabaseReturn } from "../../hooks/use-database";
import {
  OPERATORS_FOR_TYPE,
  OPERATOR_LABEL,
  NO_VALUE_OPERATORS,
  type FilterOperator,
  type FilterRule,
  type FilterGroup,
  type FilterGroupOperator,
} from "../../types/filter-types";
import { PROPERTY_TYPE_ICONS } from "../../types/property-type-meta";
import "./filter-rule-chips.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Grid,
  GridCell,
  GridRow,
} from "src/components/tiptap-ui-primitive/grid";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

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
        ? (config as Extract<PropertyConfig, { options: SelectOption[] }>)
            .options
        : [];
    return (
      <select
        className="db-chip__select"
        value={(rule.value as string) ?? ""}
        onChange={(e) =>
          onChange({ value: e.target.value } as Partial<FilterRule>)
        }
      >
        <option value="">Any</option>
        {options.map((o) => (
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
        className="db-chip__select"
        value={(rule.value as string) ?? ""}
        onChange={(e) =>
          onChange({ value: e.target.value } as Partial<FilterRule>)
        }
      >
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    );
  }

  if (type === "date" || type === "created_time" || type === "edited_time") {
    if (rule.operator === "is_within") {
      const opts = [
        { value: "past_week", label: "Past week" },
        { value: "past_month", label: "Past month" },
        { value: "the_past_7_days", label: "Past 7 days" },
        { value: "the_past_30_days", label: "Past 30 days" },
        { value: "next_week", label: "Next week" },
        { value: "next_month", label: "Next month" },
      ];
      return (
        <select
          className="db-chip__select"
          value={(rule.value as string) ?? ""}
          onChange={(e) =>
            onChange({ value: e.target.value } as Partial<FilterRule>)
          }
        >
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        className="db-chip__input"
        type="date"
        value={(rule.value as string) ?? ""}
        onChange={(e) =>
          onChange({ value: e.target.value } as Partial<FilterRule>)
        }
      />
    );
  }

  if (type === "number") {
    return (
      <input
        className="db-chip__input"
        type="number"
        value={(rule.value as number) ?? ""}
        onChange={(e) =>
          onChange({ value: Number(e.target.value) } as Partial<FilterRule>)
        }
        placeholder="Value"
      />
    );
  }

  return (
    <input
      className="db-chip__input"
      type="text"
      value={(rule.value as string) ?? ""}
      onChange={(e) =>
        onChange({ value: e.target.value } as Partial<FilterRule>)
      }
      placeholder="Value"
    />
  );
}

function FilterChip({
  rule,
  properties,
  onChange,
  onDelete,
  onPropertyChange,
}: {
  rule: FilterRule;
  properties: DatabaseProperty[];
  onChange: (patch: Partial<FilterRule>) => void;
  onDelete: () => void;
  onPropertyChange: (propertyId: ID) => void;
}) {
  const property = properties.find((p) => p.id === rule.propertyId);
  const Icon = property ? PROPERTY_TYPE_ICONS[property.config.type] : null;
  const operators = OPERATORS_FOR_TYPE[rule.propertyType] as FilterOperator[];
  const needsValue = !NO_VALUE_OPERATORS.has(rule.operator);

  // Build display label
  const propLabel = property?.name ?? "Property";
  // const opLabel = OPERATOR_LABEL[rule.operator];
  // const valLabel =
  //   needsValue && rule.value != null && rule.value !== ""
  //     ? String(rule.value)
  //     : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          style={{
            border: "1px solid var(--tt-brand-color-400)",
            padding: "2px 8px",
            height: 24,
            minHeight: 24,
            color: "var(--tt-brand-color-400)",
          }}
        >
          {Icon && (
            <Icon className="tiptap-button-icon" style={{ color: "inherit" }} />
          )}
          <span className="tiptap-button-text db-filter-chip__prop">
            {propLabel}
          </span>
          {/* <span className="db-filter-chip__op">{opLabel}</span> */}
          {/* {valLabel && (
              <span className="db-filter-chip__val">{valLabel}</span>
            )} */}
          <ChevronDown
            size={10}
            className="tiptap-button-icon-sub"
            style={{ color: "inherit" }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="db-panel">
        <Card style={{ padding: "8px 5px", minWidth: 300 }}>
          <Grid columns="1fr 2fr 1fr" gap={10}>
            <GridRow>
              <GridCell>
                <CardGroupLabel>Property</CardGroupLabel>
              </GridCell>
              <GridCell>
                <CardGroupLabel>Condition</CardGroupLabel>
              </GridCell>
              <GridCell>
                <CardGroupLabel>Value</CardGroupLabel>
              </GridCell>
            </GridRow>
            <GridRow>
              <GridCell>
                <select
                  className="db-chip__select"
                  value={rule.propertyId}
                  onChange={(e) => onPropertyChange(e.target.value)}
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </GridCell>
              <GridCell>
                <select
                  className="db-chip__select"
                  value={rule.operator}
                  onChange={(e) =>
                    onChange({
                      operator: e.target.value as FilterOperator,
                    } as Partial<FilterRule>)
                  }
                >
                  {operators.map((op) => (
                    <option key={op} value={op}>
                      {OPERATOR_LABEL[op]}
                    </option>
                  ))}
                </select>
              </GridCell>
              <GridCell>
                {/* Value */}
                {needsValue && property && (
                  <div className="db-chip-edit__row">
                    <FilterValueInput
                      rule={rule}
                      property={property}
                      onChange={onChange}
                    />
                  </div>
                )}
              </GridCell>
            </GridRow>
          </Grid>
          <Spacer orientation="vertical" size={10} />
          <CardFooter style={{ width: "100%" }}>
            <Button
              variant="ghost"
              onClick={onDelete}
              aria-label="Remove filter"
              style={{ justifyContent: "flex-start", width: "100%" }}
            >
              <Trash className="tiptap-button-icon" />
              <span className="tiptap-button-text">Remove Filter</span>
            </Button>
          </CardFooter>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

export function FilterRuleChips({
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
    if (!firstProp) return;
    const currentGroup: FilterGroup = activeView!.filters[0] ?? {
      id: nanoid(),
      operator: "and" as FilterGroupOperator,
      rules: [],
    };
    saveGroup({
      ...currentGroup,
      rules: [
        ...(currentGroup.rules as FilterRule[]),
        makeFilterRule(firstProp),
      ],
    });
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

  if (rules.length === 0) return null;

  return (
    <div className="db-filter-chips">
      {rules.map((rule) => (
        <FilterChip
          key={rule.id}
          rule={rule}
          properties={attrs.properties}
          onChange={(patch) => updateRule(rule.id, patch)}
          onDelete={() => deleteRule(rule.id)}
          onPropertyChange={(propertyId) => {
            const newProp = attrs.properties.find((p) => p.id === propertyId);
            if (!newProp) return;
            updateRule(rule.id, makeFilterRule(newProp));
          }}
        />
      ))}
      <Button
        variant="ghost"
        className="db-filter-chips__add"
        onClick={addRule}
      >
        <Plus className="tiptap-button-icon" />
        <span className="tiptap-button-text">Add filter</span>
      </Button>
    </div>
  );
}
