import { StatusFilterDropdown } from "./status-filter-dropdown";
import { SelectFilterDropdown } from "./select-filter-dropdown";
import { TextFilterDropdown } from "./text-filter-dropdown";
// import { DateFilterDropdown } from "./date-filter-dropdown"; // when built
import type { DatabaseProperty, ID } from "src/types";
import type { FilterRule } from "src/types/filter-types";

export function SimpleFilterEditor({
  property,
  rule,
  onUpdate,
  onDelete,
  onPromote,
}: {
  property: DatabaseProperty;
  rule: FilterRule;
  onUpdate: (id: ID, patch: Partial<FilterRule>) => void;
  onDelete: (id: ID) => void;
  onPromote: () => void;
}) {
  const shared = { property, rule, onUpdate, onDelete, onPromote } as const;

  switch (rule.propertyType) {
    case "status":
      return <StatusFilterDropdown {...shared} rule={rule} />;

    case "select":
    case "multi_select":
      return <SelectFilterDropdown {...shared} rule={rule} />;

    // case "date":
    // case "created_time":
    // case "edited_time":
    //   return <DateFilterDropdown {...shared} rule={rule} />;

    default:
      // title, text, url, email, phone, number, relation, formula, person…
      return <TextFilterDropdown {...shared} rule={rule} />;
  }
}
