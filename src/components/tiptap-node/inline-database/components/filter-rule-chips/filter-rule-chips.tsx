import { nanoid } from "nanoid";
import { Plus, ChevronDown, Trash } from "lucide-react";
import {
  Card,
  CardFooter,
  CardGroupLabel,
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
import {
  Grid,
  GridCell,
  GridRow,
} from "src/components/tiptap-ui-primitive/grid";
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
          variant="ghost"
          style={{
            width: "100%",
            borderRadius: "var(--tt-radius-sm)",
            border: "1px solid var(--tt-border-color)",
            padding: "3px 5px",
            justifyContent: "flex-start",
          }}
        >
          <span className="tiptap-button-text">{label}</span>
          <Spacer orientation="horizontal" />
          <ChevronDown className="tiptap-button-icon-sub" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <Card
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
// ── Replace the FilterChip component with this version ─────────────────────
// (adds `locked`: renders a static chip with no edit popover when locked)

function FilterChip({
  rule,
  properties,
  onChange,
  onDelete,
  onPropertyChange,
  locked = false,
}: {
  rule: FilterRule;
  properties: DatabaseProperty[];
  onChange: (patch: Partial<FilterRule>) => void;
  onDelete: () => void;
  onPropertyChange: (propertyId: ID) => void;
  locked?: boolean;
}) {
  const property = properties.find((p) => p.id === rule.propertyId);
  // Material Symbols name string now, not an icon component.
  const iconName = property ? PROPERTY_TYPE_ICONS[property.config.type] : null;
  const operators = OPERATORS_FOR_TYPE[rule.propertyType] as FilterOperator[];
  const needsValue = !NO_VALUE_OPERATORS.has(rule.operator);
  const propLabel = property?.name ?? "Property";

  const chipButton = (
    <Button
      variant="ghost"
      style={{
        border: "1px solid var(--tt-brand-color-400)",
        padding: "2px 8px",
        height: 24,
        minHeight: 24,
        color: "var(--tt-brand-color-400)",
        fontSize: 14,
        cursor: locked ? "default" : undefined,
      }}
    >
      {iconName && (
        <DynamicIcon
          name={iconName}
          size={20}
          filled={false}
          className="tiptap-button-icon"
          style={{ color: "inherit" }}
        />
      )}
      <span className="tiptap-button-text db-filter-chip__prop">
        {propLabel}
      </span>
      {!locked && (
        <ChevronDown
          size={10}
          className="tiptap-button-icon-sub"
          style={{ color: "inherit" }}
        />
      )}
    </Button>
  );

  // Locked → static chip, no edit popover.
  if (locked) return chipButton;

  return (
    <Popover>
      <PopoverTrigger asChild>{chipButton}</PopoverTrigger>
      <PopoverContent side="bottom" align="start">
        <Card
          style={{
            padding: "5px",
            minWidth: 380,
            boxShadow: "var(--tt-shadow-elevated-sm)",
            background: "var(--tt-card-bg-color)",
          }}
        >
          <Grid columns={`${needsValue ? "1fr 1fr 1fr" : "1fr 1fr"}`} gap={10}>
            <GridRow>
              <GridCell>
                <CardGroupLabel>Property</CardGroupLabel>
              </GridCell>
              <GridCell>
                <CardGroupLabel>Condition</CardGroupLabel>
              </GridCell>
              {needsValue && (
                <GridCell>
                  <CardGroupLabel>Value</CardGroupLabel>
                </GridCell>
              )}
            </GridRow>
            <GridRow>
              <GridCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      style={{
                        width: "100%",
                        borderRadius: "var(--tt-radius-sm)",
                        border: "1px solid var(--tt-border-color)",
                        padding: "3px 5px",
                      }}
                    >
                      {iconName && (
                        <DynamicIcon
                          name={iconName}
                          size={20}
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
                      style={{
                        padding: "5px",
                        minWidth: 180,
                        boxShadow: "var(--tt-shadow-elevated-sm)",
                      }}
                    >
                      <CardItemGroup
                        style={{ width: "100%", justifyContent: "flex-start" }}
                      >
                       {properties.map((p) => {
                          const pIconName = PROPERTY_TYPE_ICONS[p.config.type];
                          return (
                            <DropdownMenuItem key={p.id} asChild>
                              <Button
                                variant="ghost"
                                onClick={() => onPropertyChange(p.id)}
                                style={{ justifyContent: "flex-start" }}
                              >
                                <DynamicIcon
                                  name={pIconName}
                                  size={20}
                                  filled={false}
                                  className="tiptap-button-icon"
                                />
                                <span>{p.name}</span>
                              </Button>
                            </DropdownMenuItem>
                          );
                        })}
                      </CardItemGroup>
                    </Card>
                  </DropdownMenuContent>
                </DropdownMenu>
              </GridCell>
              <GridCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      style={{
                        width: "100%",
                        borderRadius: "var(--tt-radius-sm)",
                        border: "1px solid var(--tt-border-color)",
                      }}
                    >
                      <span className="tiptap-button-text">
                        {rule.operator}
                      </span>
                      <Spacer orientation="horizontal" />
                      <ChevronDown className="tiptap-button-icon-sub" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <Card
                      style={{
                        padding: "5px",
                        minWidth: 180,
                        boxShadow: "var(--tt-shadow-elevated-sm)",
                      }}
                    >
                      <CardItemGroup
                        style={{ width: "100%", justifyContent: "flex-start" }}
                      >
                        {operators.map((op) => (
                          <DropdownMenuItem key={op} asChild>
                            <Button
                              variant="ghost"
                              onClick={() =>
                                onChange({
                                  operator: op as FilterOperator,
                                } as Partial<FilterRule>)
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
              </GridCell>
              {needsValue && (
                <GridCell>
                  {property && (
                    <div className="db-chip-edit__row">
                      <FilterValueInput
                        rule={rule}
                        property={property}
                        onChange={onChange}
                      />
                    </div>
                  )}
                </GridCell>
              )}
            </GridRow>
          </Grid>
          <Spacer orientation="vertical" size={10} />
          <CardFooter style={{ width: "100%" }}>
            <Button
              variant="ghost"
              onClick={onDelete}
              aria-label="Remove filter"
              style={{
                justifyContent: "flex-start",
                width: "100%",
                fontSize: 12,
              }}
            >
              <Trash
                className="tiptap-button-icon"
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "var(--tt-radius-sm)",
                }}
              />
              <span className="tiptap-button-text">Remove Filter</span>
            </Button>
          </CardFooter>
        </Card>
      </PopoverContent>
    </Popover>
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

  const group: FilterGroup = activeView?.filters
    ? activeView?.filters[0]
    : {
        id: nanoid(),
        operator: "and" as FilterGroupOperator,
        rules: [],
      };
  const rules = group?.rules ?? ([] as FilterRule[]);

  function saveGroup(updated: FilterGroup) {
    if (!activeView) return;
    db.updateView(activeView!.id, { filters: [updated] });
  }

  function addRule() {
    const firstProp = properties[0];
    if (!firstProp) return;
    const currentGroup: FilterGroup = activeView?.filters[0] ?? {
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
          rule={rule as FilterRule}
          properties={properties}
          onChange={(patch) => updateRule(rule.id, patch)}
          onDelete={() => deleteRule(rule.id)}
          onPropertyChange={(propertyId) => {
            const newProp = properties.find((p) => p.id === propertyId);
            if (!newProp) return;
            updateRule(rule.id, makeFilterRule(newProp));
          }}
          locked={locked}
        />
      ))}
      {/* Add filter — hidden when locked. */}
      {!locked && (
        <Button
          variant="ghost"
          className="db-filter-chips__add"
          onClick={addRule}
        >
          <Plus className="tiptap-button-icon" />
          <span className="tiptap-button-text">Add filter</span>
        </Button>
      )}
    </div>
  );
}
