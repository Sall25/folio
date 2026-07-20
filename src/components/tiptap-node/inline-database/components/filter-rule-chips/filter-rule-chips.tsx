import { nanoid } from "nanoid";
import { Plus, ChevronDown, Trash, Ellipsis, ListFilter } from "lucide-react";
import {
  Card,
  CardFooter,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type {
  DatabaseProperty,
  DatabaseView,
  ID,
  PropertyConfig,
  SelectOption,
} from "src/types";
import type { UseDatabaseReturn } from "../../hooks/use-database";
import {
  OPERATORS_FOR_TYPE,
  OPERATOR_LABEL,
  NO_VALUE_OPERATORS,
  type FilterOperator,
  type FilterRule,
  type FilterGroup,
  type FilterGroupOperator,
} from "src/types/filter-types";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import "./filter-rule-chips.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";

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
        operator: OPERATORS_FOR_TYPE["multi_select"][0] as never,
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

function FilterRow({
  rule,
  index,
  groupOperator,
  properties,
  onChange,
  onDelete,
  onPropertyChange,
  onGroupOperatorChange,
}: {
  rule: FilterRule;
  index: number;
  groupOperator: FilterGroupOperator;
  properties: DatabaseProperty[];
  onChange: (patch: Partial<FilterRule>) => void;
  onDelete: () => void;
  onPropertyChange: (propertyId: ID) => void;
  onGroupOperatorChange: (op: FilterGroupOperator) => void;
}) {
  const property = properties.find((p) => p.id === rule.propertyId);
  const iconName = property ? PROPERTY_TYPE_ICONS[property.config.type] : null;
  const operators = OPERATORS_FOR_TYPE[rule.propertyType] as FilterOperator[];
  const needsValue = !NO_VALUE_OPERATORS.has(rule.operator);
  const propLabel = property?.name ?? "Property";

  const selectStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: "var(--tt-radius-sm)",
    border: "1px solid var(--tt-border-color)",
    padding: "3px 6px",
    justifyContent: "flex-start",
    fontSize: 12,
    height: 28,
    minHeight: 28,
  };

  return (
    <div className="db-filter-row">
      {/* Conjunction. Row 0 is "Where"; row 1 owns the dropdown; the rest are
          static — FilterGroup has ONE operator, so it can't vary per row. */}
      <div className="db-filter-row__conj">
        {index === 0 ? (
          <span className="db-filter-row__where">Where</span>
        ) : index === 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                style={{ ...selectStyle, border: "none" }}
              >
                <span className="tiptap-button-text">
                  {groupOperator === "and" ? "And" : "Or"}
                </span>
                <Spacer orientation="horizontal" />
                <ChevronDown className="tiptap-button-icon-sub" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <Card style={{ padding: 5, minWidth: 120 }}>
                <CardItemGroup style={{ width: "100%" }}>
                  {(["and", "or"] as const).map((op) => (
                    <DropdownMenuItem key={op} asChild>
                      <Button
                        variant="ghost"
                        style={{ justifyContent: "flex-start", width: "100%" }}
                        data-active-state={groupOperator === op ? "on" : "off"}
                        onClick={() => onGroupOperatorChange(op)}
                      >
                        <span className="tiptap-button-text">
                          {op === "and" ? "And" : "Or"}
                        </span>
                      </Button>
                    </DropdownMenuItem>
                  ))}
                </CardItemGroup>
              </Card>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="db-filter-row__where">
            {groupOperator === "and" ? "And" : "Or"}
          </span>
        )}
      </div>

      {/* Property */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" style={selectStyle}>
            {iconName && (
              <DynamicIcon
                name={iconName}
                size={16}
                filled={false}
                className="tiptap-button-icon"
              />
            )}
            <span className="tiptap-button-text">{propLabel}</span>
            <Spacer orientation="horizontal" />
            <ChevronDown className="tiptap-button-icon-sub" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <Card
            className="option-dropdown"
            style={{
              padding: 5,
              minWidth: 180,
              maxHeight: 260,
              overflowY: "auto",
            }}
          >
            <CardItemGroup style={{ width: "100%" }}>
              {properties.map((p) => (
                <DropdownMenuItem key={p.id} asChild>
                  <Button
                    variant="ghost"
                    onClick={() => onPropertyChange(p.id)}
                    data-active-state={rule.propertyId === p.id ? "on" : "off"}
                    style={{ justifyContent: "flex-start", width: "100%" }}
                  >
                    <DynamicIcon
                      name={PROPERTY_TYPE_ICONS[p.config.type]}
                      size={16}
                      filled={false}
                      className="tiptap-button-icon"
                    />
                    <span className="tiptap-button-text">{p.name}</span>
                  </Button>
                </DropdownMenuItem>
              ))}
            </CardItemGroup>
          </Card>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Operator */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" style={selectStyle}>
            <span className="tiptap-button-text">
              {OPERATOR_LABEL[rule.operator]}
            </span>
            <Spacer orientation="horizontal" />
            <ChevronDown className="tiptap-button-icon-sub" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <Card
            className="option-dropdown"
            style={{
              padding: 5,
              minWidth: 180,
              maxHeight: 260,
              overflowY: "auto",
            }}
          >
            <CardItemGroup style={{ width: "100%" }}>
              {operators.map((op) => (
                <DropdownMenuItem key={op} asChild>
                  <Button
                    variant="ghost"
                    data-active-state={rule.operator === op ? "on" : "off"}
                    style={{ justifyContent: "flex-start", width: "100%" }}
                    onClick={() =>
                      onChange({ operator: op } as Partial<FilterRule>)
                    }
                  >
                    <span className="tiptap-button-text">
                      {OPERATOR_LABEL[op]}
                    </span>
                  </Button>
                </DropdownMenuItem>
              ))}
            </CardItemGroup>
          </Card>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Value — omitted for is_empty / is_checked style operators. */}
      <div className="db-filter-row__value">
        {needsValue && property && (
          <FilterValueInput
            rule={rule}
            property={property}
            onChange={onChange}
          />
        )}
      </div>

      {/* Per-row menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="db-filter-row__menu">
            <Ellipsis className="tiptap-button-icon" size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <Card style={{ padding: 5, minWidth: 160 }}>
            <CardItemGroup style={{ width: "100%" }}>
              <DropdownMenuItem asChild>
                <Button
                  variant="ghost"
                  onClick={onDelete}
                  style={{ justifyContent: "flex-start", width: "100%" }}
                >
                  <Trash className="tiptap-button-icon" size={14} />
                  <span className="tiptap-button-text">Delete rule</span>
                </Button>
              </DropdownMenuItem>
            </CardItemGroup>
          </Card>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function OptionDropdown({
  current,
  options,
  includeAny = true,
  onSelect,
}: {
  current: string;
  options: { id: string; label: string }[];
  includeAny?: boolean;
  onSelect: (id: string) => void;
}) {
  const selected = options.find((o) => o.id === current);
  const label = selected ? selected.label : includeAny ? "Any" : "Select…";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          contentEditable={false}
          variant="ghost"
          style={{
            width: "100%",
            borderRadius: "var(--tt-radius-sm)",
            border: "1px solid var(--tt-border-color)",
            padding: "3px 5px",
            justifyContent: "flex-start",
            fontSize: 12,
            caretColor: "transparent",
            userSelect: "none",
          }}
        >
          <span className="tiptap-button-text">{label}</span>
          <Spacer orientation="horizontal" />
          <ChevronDown className="tiptap-button-icon-sub" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <Card
          className="option-dropdown"
          style={{
            padding: "5px",
            minWidth: 160,
            maxHeight: 260,
            overflowY: "auto",
            boxShadow: "var(--tt-shadow-elevated-sm)",
          }}
        >
          <CardItemGroup
            style={{ width: "100%", justifyContent: "flex-start" }}
          >
            {includeAny && (
              <DropdownMenuItem asChild>
                <Button
                  variant="ghost"
                  style={{ justifyContent: "flex-start", width: "100%" }}
                  data-active-state={current === "" ? "on" : "off"}
                  onClick={() => onSelect("")}
                >
                  <span className="tiptap-button-text">Any</span>
                </Button>
              </DropdownMenuItem>
            )}
            {options.map((o) => (
              <DropdownMenuItem key={o.id} asChild>
                <Button
                  variant="ghost"
                  style={{ justifyContent: "flex-start", width: "100%" }}
                  data-active-state={current === o.id ? "on" : "off"}
                  onClick={() => onSelect(o.id)}
                >
                  <span className="tiptap-button-text">{o.label}</span>
                </Button>
              </DropdownMenuItem>
            ))}
          </CardItemGroup>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
  const current = (rule.value as string) ?? "";

  if (type === "select" || type === "multi_select") {
    const options =
      "options" in config
        ? (config as Extract<PropertyConfig, { options: SelectOption[] }>)
            .options
        : [];
    return (
      <OptionDropdown
        current={current}
        options={options.map((o) => ({ id: o.id, label: o.label }))}
        onSelect={(id) => onChange({ value: id } as Partial<FilterRule>)}
      />
    );
  }

  if (type === "status") {
    const groups =
      "groups" in config
        ? (config as { groups: { items: { id: ID; name: string }[] }[] }).groups
        : [];
    const options = groups
      .flatMap((g) => g.items)
      .map((i) => ({ id: String(i.id), label: i.name }));
    return (
      <OptionDropdown
        current={current}
        options={options}
        onSelect={(id) => onChange({ value: id } as Partial<FilterRule>)}
      />
    );
  }

  if (type === "date" || type === "created_time" || type === "edited_time") {
    if (rule.operator === "is_within") {
      const opts = [
        { id: "past_week", label: "Past week" },
        { id: "past_month", label: "Past month" },
        { id: "the_past_7_days", label: "Past 7 days" },
        { id: "the_past_30_days", label: "Past 30 days" },
        { id: "next_week", label: "Next week" },
        { id: "next_month", label: "Next month" },
      ];
      return (
        <OptionDropdown
          current={current}
          options={opts}
          includeAny={false}
          onSelect={(id) => onChange({ value: id } as Partial<FilterRule>)}
        />
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

export function FilterRuleChips({
  db,
  activeView,
  properties,
  locked = false,
}: {
  db: UseDatabaseReturn;
  activeView: DatabaseView | undefined;
  properties: DatabaseProperty[];
  locked?: boolean;
}) {
  if (!activeView) return null;

  const group: FilterGroup = activeView?.filters?.[0] ?? {
    id: nanoid(),
    operator: "and" as FilterGroupOperator,
    rules: [],
  };
  const rules = (group?.rules ?? []) as FilterRule[];

  function saveGroup(updated: FilterGroup) {
    if (!activeView) return;
    db.updateView(activeView.id, { filters: [updated] });
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
        r.id === id ? { ...r, ...patch } : r,
      ) as FilterGroup["rules"],
    });
  }

  function deleteRule(id: ID) {
    saveGroup({ ...group, rules: rules.filter((r) => r.id !== id) });
  }

  if (rules.length === 0) return null;

  const label = rules.length === 1 ? "1 rule" : `${rules.length} rules`;

  const chip = (
    <Button
      variant="ghost"
      style={{
        height: 24,
        minHeight: 24,
        padding: "0 8px",
        gap: 5,
        borderRadius: "var(--tt-radius-lg)",
        fontSize: 12,
        fontWeight: 500,
        color: "var(--tt-brand-color-400)",
        background:
          "color-mix(in srgb, var(--tt-brand-color-400) 14%, transparent)",
        cursor: locked ? "default" : undefined,
      }}
    >
      <ListFilter
        size={13}
        className="tiptap-button-icon"
        style={{ color: "inherit" }}
      />
      <span className="tiptap-button-text">{label}</span>
      {!locked && (
        <ChevronDown
          size={11}
          className="tiptap-button-icon-sub"
          style={{ color: "inherit" }}
        />
      )}
    </Button>
  );

  if (locked) return <div className="db-filter-chips">{chip}</div>;

  return (
    <div className="db-filter-chips" contentEditable={false}>
      <Popover>
        <PopoverTrigger asChild>{chip}</PopoverTrigger>
        <PopoverContent side="bottom" align="start">
          <Card
            className="filter-chip--card"
            style={{ padding: 6, minWidth: 560 }}
          >
            <CardItemGroup style={{ width: "100%", gap: 4 }}>
              {rules.map((rule, i) => (
                <FilterRow
                  key={rule.id}
                  rule={rule}
                  index={i}
                  groupOperator={group.operator}
                  properties={properties}
                  onChange={(patch) => updateRule(rule.id, patch)}
                  onDelete={() => deleteRule(rule.id)}
                  onPropertyChange={(propertyId) => {
                    const newProp = properties.find((p) => p.id === propertyId);
                    if (!newProp) return;
                    // Rebuild the rule — a new property type means a different
                    // operator set and value shape, so patching would leave an
                    // operator the new type doesn't support.
                    updateRule(rule.id, makeFilterRule(newProp));
                  }}
                  onGroupOperatorChange={(op) =>
                    saveGroup({ ...group, operator: op })
                  }
                />
              ))}
            </CardItemGroup>

            <CardFooter
              style={{ width: "100%", flexDirection: "column", gap: 2 }}
            >
              <Button
                variant="ghost"
                onClick={addRule}
                style={{
                  justifyContent: "flex-start",
                  width: "100%",
                  fontSize: 12,
                }}
              >
                <Plus className="tiptap-button-icon" size={14} />
                <span className="tiptap-button-text">Add filter rule</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => saveGroup({ ...group, rules: [] })}
                style={{
                  justifyContent: "flex-start",
                  width: "100%",
                  fontSize: 12,
                }}
              >
                <Trash className="tiptap-button-icon" size={14} />
                <span className="tiptap-button-text">Delete filter</span>
              </Button>
            </CardFooter>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}
