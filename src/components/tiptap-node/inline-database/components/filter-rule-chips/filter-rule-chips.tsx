import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type { DatabaseProperty, ID } from "src/types";
import { type FilterRule, type FilterGroup } from "src/types/filter-types";
import { FilterChipButton } from "./filter-chip-button";
import { useFilterRules } from "./use-filter-rules";
import { useDatabaseContext } from "../../nodes/database-context";
import "./filter-rule-chips.scss";
import { AdvancedFilterBuilder } from "./advanced-filter-builder";
import { SimpleFilterEditor } from "./simple-filter-editor";
import type { UseDatabaseReturn } from "../../hooks";

export function FilterRuleChips() {
  const { db, attrs, visibleProperties: properties } = useDatabaseContext();
  const activeView = db.activeView;
  const locked = !!attrs.locked;

  const filters = (activeView?.filters ?? []) as FilterGroup[];

  if (!activeView) return null;
  if (filters.length === 0) return null;

  return (
    <div className="db-filter-chips" contentEditable={false}>
      {filters.map((group) => (
        <FilterChip
          key={group.id}
          db={db}
          viewId={activeView.id}
          group={group}
          properties={properties}
          locked={locked}
        />
      ))}
    </div>
  );
}

function FilterChip({
  db,
  viewId,
  group,
  properties,
  locked,
}: {
  db: UseDatabaseReturn;
  viewId: ID;
  group: FilterGroup;
  properties: DatabaseProperty[];
  locked: boolean;
}) {
  const rules = (group.rules ?? []) as FilterRule[];
  const ops = useFilterRules(db, viewId, group, rules, properties);

  const isAdvanced = group.advanced === true || rules.length > 1;

  if (locked) {
    return <FilterChipButton count={rules.length} locked />;
  }

  // Advanced chip → one "N rules" summary button → advanced builder popover
  if (isAdvanced) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <FilterChipButton
            count={rules.length}
            locked={false}
            advanced={isAdvanced}
          />
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start">
          <AdvancedFilterBuilder
            group={group}
            rules={rules}
            properties={properties}
            {...ops}
          />
        </PopoverContent>
      </Popover>
    );
  }

  // Simple chip → shows the single rule's label → simple editor popover
  const rule = rules[0];
  const property = properties.find((p) => p.id === rule?.propertyId);
  if (!rule || !property) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <FilterChipButton
          rule={rule}
          property={property}
          locked={false}
          count={1}
        />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start">
        <SimpleFilterEditor
          property={property}
          rule={rule}
          onUpdate={ops.updateRule}
          onDelete={ops.clearRules}
          onPromote={ops.promoteToAdvanced}
        />
      </PopoverContent>
    </Popover>
  );
}
