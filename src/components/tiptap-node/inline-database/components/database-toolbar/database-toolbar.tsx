/* eslint-disable @typescript-eslint/no-unused-vars */
import { useRef, useState } from "react";
import {
  Filter,
  ArrowUpDown,
  Group,
  Eye,
  Search,
  Plus,
  GripVertical,
  Trash2,
  Check,
  X,
  ChevronDown,
} from "lucide-react";
import { nanoid } from "nanoid";

import { Button } from "src/components/tiptap-ui-primitive/button";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";

import type {
  DatabaseAttrs,
  DatabaseProperty,
  DatabaseView,
  BoardView,
  ID,
  SortRule,
  PropertyConfig,
  SelectOption,
} from "../../types/types";
import { isGroupableProperty } from "../../types/types";
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
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import { usePeekPage } from "src/components/tiptap-templates/simple/context/peek-page-context";

// ── Types ──────────────────────────────────────────────────────────────────

interface DatabaseToolbarProps {
  attrs: DatabaseAttrs;
  db: UseDatabaseReturn;
  onUpdateAttributes?: (attrs: DatabaseAttrs) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getActiveView(attrs: DatabaseAttrs): DatabaseView | undefined {
  return attrs.views.find((v) => v.id === attrs.activeViewId) ?? attrs.views[0];
}

function totalFilterRules(filters: FilterGroup[]): number {
  return filters.reduce((sum, g) => sum + g.rules.length, 0);
}

/** Build a new FilterRule with correct propertyType from a DatabaseProperty */
function makeFilterRule(property: DatabaseProperty): FilterRule {
  const type = property.config.type;
  const operator = OPERATORS_FOR_TYPE[type]?.[0];

  // Each branch satisfies the discriminated union
  switch (type) {
    case "number":
      // case "rollup":
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
      // title, text, url, email, phone
      return {
        id: nanoid(),
        propertyId: property.id,
        propertyType: type as "title",
        operator: "contains",
        value: "",
      };
  }
}

// ── Toolbar root ───────────────────────────────────────────────────────────

export function DatabaseToolbar({
  attrs,
  db,
  onUpdateAttributes,
}: DatabaseToolbarProps) {
  const [open, setOpen] = useState(false);
  const activeView = getActiveView(attrs);
  const filters = activeView?.filters ?? [];
  const sorts = activeView?.sorts ?? [];
  const activeFilterCount = totalFilterRules(filters);
  const activeSortCount = sorts.length;
  const { pages, addPageTemplateAsync } = usePages();
  const { setPeekPageId } = usePeekPage();

  return (
    <CardItemGroup orientation="horizontal" style={{ marginBottom: 10 }}>
      <input
        className="title-input"
        placeholder="New Database"
        style={{
          fontSize: 18,
          color: "var(--tt-paragraph-text-color)",
        }}
        value={`${db.title}`}
        onChange={(e) => db.onUpdateTitle?.(e.target.value)}
      />

      <Spacer orientation="horizontal" />

      <CardItemGroup orientation="horizontal">
        <SearchButton db={db} />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={activeFilterCount > 0 ? "db-toolbar__btn--active" : ""}
            >
              <Filter size={14} />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="db-toolbar__badge">{activeFilterCount}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="db-panel">
            <FilterPanel attrs={attrs} db={db} activeView={activeView} />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={activeSortCount > 0 ? "db-toolbar__btn--active" : ""}
            >
              <ArrowUpDown size={14} />
              <span>Sort</span>
              {activeSortCount > 0 && (
                <span className="db-toolbar__badge">{activeSortCount}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="db-panel">
            <SortPanel
              attrs={attrs}
              db={db}
              activeView={activeView}
              sorts={sorts}
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost">
              <Group size={14} />
              <span>Group</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="db-panel">
            <GroupPanel attrs={attrs} db={db} activeView={activeView} />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost">
              <Eye size={14} />
              <span>Properties</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="db-panel">
            <PropertiesPanel attrs={attrs} db={db} activeView={activeView} />
          </PopoverContent>
        </Popover>

        <CardItemGroup
          orientation="horizontal"
          style={{
            background: "var(--tt-brand-color-400)",
            borderRadius: "var(--tt-radius-sm)",
            color: "white",
            minHeight: 24,
            height: 24,
            padding: "0px 5px",
          }}
        >
          <span style={{ fontSize: 11.5, fontWeight: "bold" }}>New</span>
          <Separator orientation="vertical" />
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                style={{ background: "transparent", minWidth: 15, width: 15 }}
              >
                <ChevronDown
                  className="tiptap-button-icon"
                  style={{ color: "white" }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <Card style={{ padding: "5px 10px" }}>
                <CardBody>
                  <CardItemGroup>
                    {pages &&
                      pages
                        .filter((p) => p.category === "Template")
                        .map((p) => (
                          <Button
                            key={p.id}
                            variant="ghost"
                            style={{
                              justifyContent: "flex-start",
                              minHeight: 24,
                              height: 24,
                            }}
                            onClick={() =>
                              onUpdateAttributes?.({
                                ...attrs,
                                templateId: p.id,
                              })
                            }
                          >
                            <PageItemIcon cover={p.cover} />
                            <span className="tiptap-button-text">
                              {p.title}
                            </span>
                          </Button>
                        ))}
                  </CardItemGroup>
                </CardBody>
                <CardFooter>
                  <Button
                    variant="ghost"
                    style={{
                      background: "var(--tt-brand-color-400)",
                      justifyContent: "flex-start",
                    }}
                    onClick={() => {
                      setOpen(false);
                      addPageTemplateAsync({
                        title: "New template",
                        parentId: null,
                      })
                        .then((newPage) => setPeekPageId(newPage.id))
                        .catch((err) =>
                          console.log("Failed to add a new template", err),
                        );
                    }}
                  >
                    <Plus className="tiptap-button-icon" />
                    <span>Create a template</span>
                  </Button>
                </CardFooter>
              </Card>
            </PopoverContent>
          </Popover>
        </CardItemGroup>
      </CardItemGroup>
    </CardItemGroup>
  );
}

// ── Search ─────────────────────────────────────────────────────────────────

function SearchButton({ db }: { db: UseDatabaseReturn }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          onClick={() => setTimeout(() => inputRef.current?.focus(), 0)}
        >
          <Search size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="db-panel db-panel--search"
      >
        <div className="db-search">
          <Search size={13} className="db-search__icon" />
          <input
            ref={inputRef}
            className="db-search__input"
            placeholder="Search records..."
            value={db.searchQuery}
            onChange={(e) => db.setSearchQuery(e.target.value)}
          />
          {db.searchQuery && (
            <button
              className="db-search__clear"
              onClick={() => db.setSearchQuery("")}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Filter panel ───────────────────────────────────────────────────────────

function FilterPanel({
  attrs,
  db,
  activeView,
}: {
  attrs: DatabaseAttrs;
  db: UseDatabaseReturn;
  activeView: DatabaseView | undefined;
}) {
  if (!activeView) return null;

  const group: FilterGroup = activeView?.filters[0] ?? {
    id: nanoid(),
    operator: "and" as FilterGroupOperator,
    rules: [],
  };
  const rules = group.rules as FilterRule[];

  function saveGroup(updated: FilterGroup) {
    const rest = activeView?.filters.slice(1);
    if (!activeView || !rest) return;
    // db.updateView(activeView?.id, { filters: [updated, ...rest] });
  }

  function addRule() {
    const firstProp = attrs.properties[0];
    if (!firstProp) return;
    saveGroup({ ...group, rules: [...rules, makeFilterRule(firstProp)] });
  }

  function updateOperator(operator: FilterGroupOperator) {
    saveGroup({ ...group, operator });
  }

  function updateRule(id: ID, patch: Partial<FilterRule>) {
    // saveGroup({
    //   ...group,
    //   rules: rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    // });
  }

  function deleteRule(id: ID) {
    saveGroup({ ...group, rules: rules.filter((r) => r.id !== id) });
  }

  return (
    <Card>
      <CardHeader>
        {rules.length === 0 && (
          <span className="db-panel__empty">
            No filters applied to this view
          </span>
        )}
        {rules.length > 1 && (
          <div className="db-panel__conjunction-row">
            <span className="db-panel__label">
              In this view, show records where
            </span>
            <div className="db-panel__conjunction-group">
              {(["and", "or"] as const).map((op) => (
                <button
                  key={op}
                  className={`db-panel__conjunction-btn ${group.operator === op ? "db-panel__conjunction-btn--active" : ""}`}
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

      <CardFooter>
        <Button variant="ghost" onClick={addRule}>
          <Plus size={13} />
          Add filter rule
        </Button>
      </CardFooter>
    </Card>
  );
}

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
  const operators = OPERATORS_FOR_TYPE[rule.propertyType] as FilterOperator[];
  const needsValue = !NO_VALUE_OPERATORS.has(rule.operator);
  const property = properties.find((p) => p.id === rule.propertyId);

  return (
    <div className="db-filter-rule">
      <GripVertical size={13} className="db-filter-rule__drag" />

      <span className="db-filter-rule__conjunction">
        {index === 0 ? "Where" : groupOperator}
      </span>

      {/* Property picker */}
      <select
        className="db-select"
        value={rule.propertyId}
        onChange={(e) => onPropertyChange(e.target.value)}
      >
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {/* Operator picker */}
      <select
        className="db-select"
        value={rule.operator}
        onChange={(e) =>
          onChange({ operator: e.target.value as FilterOperator })
        }
      >
        {operators.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABEL[op]}
          </option>
        ))}
      </select>

      {/* Value input */}
      {needsValue && property && (
        <FilterValueInput rule={rule} property={property} onChange={onChange} />
      )}

      <button className="db-filter-rule__delete" onClick={onDelete}>
        <Trash2 size={13} />
      </button>
    </div>
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

  if (type === "select" || type === "multi_select") {
    const options =
      "options" in config
        ? (config as Extract<PropertyConfig, { options: SelectOption[] }>)
            .options
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

  // Default: text (title, text, url, email, phone, formula, relation, person)
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

// ── Sort panel ─────────────────────────────────────────────────────────────

function SortPanel({
  attrs,
  db,
  activeView,
  sorts,
}: {
  attrs: DatabaseAttrs;
  db: UseDatabaseReturn;
  activeView: DatabaseView | undefined;
  sorts: SortRule[];
}) {
  if (!activeView) return null;

  function addSort() {
    const unusedProp = attrs.properties.find(
      (p) => !sorts.some((s) => s.propertyId === p.id),
    );
    if (!unusedProp) return;
    const newSort: SortRule = {
      id: nanoid(),
      propertyId: unusedProp.id,
      direction: "asc",
    };
    if (!activeView) return;
    db.updateView(activeView.id, { sorts: [...sorts, newSort] });
  }

  function updateSort(id: ID, patch: Partial<SortRule>) {
    if (!activeView) return;
    db.updateView(activeView?.id, {
      sorts: sorts.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  }

  function deleteSort(id: ID) {
    if (!activeView) return;
    db.updateView(activeView?.id, { sorts: sorts.filter((s) => s.id !== id) });
  }

  return (
    <Card>
      <CardHeader>
        {sorts.length === 0 && (
          <span className="db-panel__empty">No sorts applied to this view</span>
        )}
      </CardHeader>

      {sorts.length > 0 && (
        <CardBody>
          {sorts.map((sort) => {
            const property = attrs.properties.find(
              (p) => p.id === sort.propertyId,
            );
            const Icon = property
              ? PROPERTY_TYPE_ICONS[property.config.type]
              : null;
            return (
              <div key={sort.id} className="db-sort-rule">
                <GripVertical size={13} className="db-sort-rule__drag" />
                {Icon && <Icon size={13} className="db-sort-rule__icon" />}

                <select
                  className="db-select"
                  value={sort.propertyId}
                  onChange={(e) =>
                    updateSort(sort.id, { propertyId: e.target.value })
                  }
                >
                  {attrs.properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <select
                  className="db-select db-select--direction"
                  value={sort.direction}
                  onChange={(e) =>
                    updateSort(sort.id, {
                      direction: e.target.value as "asc" | "desc",
                    })
                  }
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>

                <button
                  className="db-sort-rule__delete"
                  onClick={() => deleteSort(sort.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </CardBody>
      )}

      <CardFooter>
        <Button
          variant="ghost"
          onClick={addSort}
          disabled={sorts.length >= attrs.properties.length}
        >
          <Plus size={13} />
          Add sort
        </Button>
      </CardFooter>
    </Card>
  );
}

// ── Group panel ────────────────────────────────────────────────────────────

function GroupPanel({
  attrs,
  /*  db,*/
  activeView,
}: {
  attrs: DatabaseAttrs;
  db: UseDatabaseReturn;
  activeView: DatabaseView | undefined;
}) {
  if (!activeView) return null;

  const groupByPropertyId =
    activeView?.type === "board"
      ? (activeView as BoardView).groupByPropertyId
      : null;

  const groupableProperties = attrs.properties.filter((p) =>
    isGroupableProperty(p.config.type),
  );

  // function setGroup(propertyId: ID) {
  //   if (activeView?.type !== "board") return;
  //   if (!activeView) return;
  //   // db.updateView(activeView?.id, { groupByPropertyId: propertyId } as any);
  // }

  return (
    <Card>
      <CardBody>
        {activeView?.type !== "board" ? (
          <span className="db-panel__empty">
            Switch to board view to enable grouping
          </span>
        ) : (
          <>
            <div className="db-group-option">
              <button
                className={`db-group-option__btn ${!groupByPropertyId ? "db-group-option__btn--active" : ""}`}
              >
                {!groupByPropertyId && <Check size={13} />}
                <span>No grouping</span>
              </button>
            </div>

            <Separator />

            {groupableProperties.map((p) => {
              const Icon = PROPERTY_TYPE_ICONS[p.config.type];
              const isActive = groupByPropertyId === p.id;
              return (
                <div key={p.id} className="db-group-option">
                  <button
                    className={`db-group-option__btn ${isActive ? "db-group-option__btn--active" : ""}`}
                  >
                    {isActive ? <Check size={13} /> : <Icon size={13} />}
                    <span>{p.name}</span>
                  </button>
                </div>
              );
            })}

            {groupableProperties.length === 0 && (
              <span className="db-panel__empty">
                Add a select, status, or checkbox property to enable grouping
              </span>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}

// ── Properties panel ───────────────────────────────────────────────────────

function PropertiesPanel({
  attrs,
  db,
  activeView,
}: {
  attrs: DatabaseAttrs;
  db: UseDatabaseReturn;
  activeView: DatabaseView | undefined;
}) {
  if (!activeView) return null;

  const hidden = new Set(activeView?.hiddenProperties);

  function toggleProperty(propertyId: ID) {
    const hiddenProperties = hidden.has(propertyId)
      ? [...hidden].filter((id) => id !== propertyId)
      : [...hidden, propertyId];
    if (!activeView) return;
    db.updateView(activeView?.id, { hiddenProperties });
  }

  function showAll() {
    if (!activeView) return;
    db.updateView(activeView?.id, { hiddenProperties: [] });
  }

  function hideAll() {
    const titleProp = attrs.properties.find((p) => p.config.type === "title");
    const hiddenProperties = attrs.properties
      .filter((p) => p.id !== titleProp?.id)
      .map((p) => p.id);
    if (!activeView) return;
    db.updateView(activeView?.id, { hiddenProperties });
  }

  return (
    <Card>
      <CardBody>
        {attrs.properties.map((p) => {
          const Icon = PROPERTY_TYPE_ICONS[p.config.type];
          const isTitle = p.config.type === "title";
          const isVisible = !hidden.has(p.id);

          return (
            <div key={p.id} className="db-property-row">
              <GripVertical size={13} className="db-property-row__drag" />
              <Icon size={13} className="db-property-row__icon" />
              <span className="db-property-row__name">{p.name}</span>
              <button
                className={`db-property-row__toggle ${isVisible ? "db-property-row__toggle--on" : ""}`}
                onClick={() => !isTitle && toggleProperty(p.id)}
                disabled={isTitle}
                aria-label={isVisible ? "Hide property" : "Show property"}
              >
                <div className="db-property-row__toggle-thumb" />
              </button>
            </div>
          );
        })}
      </CardBody>

      <CardFooter>
        <Button variant="ghost" onClick={showAll}>
          Show all
        </Button>
        <Button variant="ghost" onClick={hideAll}>
          Hide all
        </Button>
      </CardFooter>
    </Card>
  );
}
