import { useState } from "react";
import { nanoid } from "nanoid";
import { Plus } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardFooter,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import {
  type DatabaseProperty,
  type DatabaseView,
  OPERATORS_FOR_TYPE,
  type FilterGroup,
  type FilterGroupOperator,
  type FilterRule,
} from "src/types";
import type { UseDatabaseReturn } from "../../hooks/use-database";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import "./filter-panel.scss";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";

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

// ── FilterPanel ────────────────────────────────────────────────────────────

export function FilterPanel({
  properties,
  db,
  activeView,
  onClose,
  bare = false,
}: {
  properties: DatabaseProperty[];
  db: UseDatabaseReturn;
  activeView: DatabaseView | undefined;
  onClose?: () => void;
  bare?: boolean;
}) {
  const [query, setQuery] = useState("");

  if (!activeView) return null;

  function saveGroup(updated: FilterGroup) {
    db.updateView(activeView!.id, { filters: [updated] });
  }

  function addRuleFor(property: DatabaseProperty) {
    const currentGroup: FilterGroup = activeView!.filters[0] ?? {
      id: nanoid(),
      operator: "and" as FilterGroupOperator,
      rules: [],
    };
    saveGroup({
      ...currentGroup,
      rules: [
        ...(currentGroup.rules as FilterRule[]),
        makeFilterRule(property),
      ],
    });
    onClose?.();
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? properties.filter((p) => p.name.toLowerCase().includes(q))
    : properties;

  const body = (
    <>
      <div className="db-filter-panel__search">
        <input
          autoFocus
          className="db-filter-panel__search-input"
          placeholder="Filter by..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <CardBody>
        <CardItemGroup>
          {filtered.length === 0 ? (
            <span className="db-panel__empty">No properties found</span>
          ) : (
            filtered.map((p) => {
              const iconName = PROPERTY_TYPE_ICONS[p.config.type];
              return (
                <Button
                  key={p.id}
                  variant="ghost"
                  style={{
                    justifyContent: "flex-start",
                    width: "100%",
                    borderRadius: "var(--tt-radius-sm)",
                  }}
                  onClick={() => addRuleFor(p)}
                >
                  {iconName && (
                    <DynamicIcon
                      name={iconName}
                      size={20}
                      filled={false}
                      className="tiptap-button-icon"
                    />
                  )}
                  <span className="tiptap-button-text">{p.name}</span>
                </Button>
              );
            })
          )}
        </CardItemGroup>
      </CardBody>

      <CardFooter style={{ width: "100%", padding: "5px 10px" }}>
        <Button
          variant="ghost"
          onClick={() => {
            const first = properties[0];
            if (first) addRuleFor(first);
          }}
          style={{
            justifyContent: "flex-start",
            width: "100%",
            borderRadius: "var(--tt-radius-sm)",
          }}
        >
          <Plus className="tiptap-button-icon" />
          <span className="tiptap-button-text">Add advanced filter</span>
        </Button>
      </CardFooter>
    </>
  );

  if (bare) return body;

  return <Card className="db-filter-panel">{body}</Card>;
}
