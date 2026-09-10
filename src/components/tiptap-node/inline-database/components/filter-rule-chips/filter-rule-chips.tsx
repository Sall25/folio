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
import { useCallback } from "react";
import { newId } from "src/lib/id";
import { makeFilterRule } from "./utils";
import { AddFilterButton } from "../add-filter-button";

const EMPTY_PROPERTIES: DatabaseProperty[] = [];

export function FilterRuleChips() {
  const { db, attrs, source } = useDatabaseContext();
  const properties = source?.properties ?? EMPTY_PROPERTIES;
  const activeView = db.activeView;
  const locked = !!attrs.locked;
  const filters = (activeView?.filters ?? []) as FilterGroup[];

  // Row-level action: "+ Add filter" creates a NEW chip (a new group).
  const addFilterFor = useCallback(
    (propertyId: ID) => {
      const view = db.activeView;
      if (!view) return;
      const prop = (properties ?? []).find((p) => p.id === propertyId);
      if (!prop) return;
      const newGroup: FilterGroup = {
        id: newId(),
        operator: "and",
        rules: [makeFilterRule(prop)],
      };
      db.updateView(view.id, {
        filters: [...(view?.filters ?? view.filters ?? []), newGroup],
      });
    },
    [db, properties],
  );

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

      {/* Appended ONCE at the end of the row — not per chip */}
      {!locked && (
        <AddFilterButton properties={properties} onPick={addFilterFor} />
      )}
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

  if (isAdvanced) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <FilterChipButton count={rules.length} locked={false} advanced />
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

  const rule = rules[0];
  console.log("properties", properties);
  console.log("rule", rule);
  const property = properties.find((p) => p.id === rule?.propertyId);

  if (!property) return null;

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
