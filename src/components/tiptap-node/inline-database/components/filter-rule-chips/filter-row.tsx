import { ChevronDown, Ellipsis, Trash } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import {
  NO_VALUE_OPERATORS,
  OPERATOR_LABEL,
  OPERATORS_FOR_TYPE,
  type DatabaseProperty,
  type FilterGroupOperator,
  type FilterOperator,
  type FilterRule,
  type ID,
} from "src/types";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import { FilterValueInput } from "./filter-value-input";

export function FilterRow({
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
