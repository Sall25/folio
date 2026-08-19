import { nanoid } from "nanoid";
import { Plus, Trash } from "lucide-react";
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
import { Button } from "src/components/tiptap-ui-primitive/button";
import type { DatabaseProperty } from "src/types";
import {
  type FilterRule,
  type FilterGroup,
  type FilterGroupOperator,
} from "src/types/filter-types";
import { FilterRow } from "./filter-row";
import { FilterChipButton } from "./filter-chip-button";
import { useFilterRules } from "./use-filter-rules";
import { useDatabaseContext } from "../../nodes/database-context";
import "./filter-rule-chips.scss";

const EMPTY_PROPERTIES: DatabaseProperty[] = [];

export function FilterRuleChips() {
  const { db, visibleProperties, attrs } = useDatabaseContext();
  const activeView = db.activeView;
  const properties = visibleProperties ?? EMPTY_PROPERTIES;
  const locked = !!attrs.locked;

  const group: FilterGroup = activeView?.filters?.[0] ?? {
    id: nanoid(),
    operator: "and" as FilterGroupOperator,
    rules: [],
  };
  const rules = (group?.rules ?? []) as FilterRule[];

  const {
    addRule,
    updateRule,
    deleteRule,
    changeProperty,
    setGroupOperator,
    clearRules,
  } = useFilterRules(db, activeView?.id, group, rules, properties);

  if (!activeView) return null;
  if (rules.length === 0) return null;

  // Locked → static badge, no popover.
  if (locked) {
    return (
      <div className="db-filter-chips">
        <FilterChipButton count={rules.length} locked />
      </div>
    );
  }

  return (
    <div className="db-filter-chips" contentEditable={false}>
      <Popover>
        <PopoverTrigger asChild>
          <FilterChipButton count={rules.length} locked={false} />
        </PopoverTrigger>
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
                  onPropertyChange={(propertyId) =>
                    changeProperty(rule.id, propertyId)
                  }
                  onGroupOperatorChange={setGroupOperator}
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
                onClick={clearRules}
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
