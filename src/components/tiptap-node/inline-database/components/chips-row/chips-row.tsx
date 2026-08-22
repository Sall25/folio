import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { useDatabaseContext } from "../../nodes/database-context";
import { FilterRuleChips } from "../filter-rule-chips";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { SortRuleChips } from "../sort-rule-chips/sort-rule-chips";

export function ChipsRow() {
  const { db, showFilterChips, showSortChips } = useDatabaseContext();
  const filterRuleCount =
    db.activeView?.filters?.reduce((n, g) => n + g.rules.length, 0) ?? 0;
  const sortCount = db.activeView?.sorts?.length ?? 0;

  if (!showFilterChips && !showSortChips) return null;

  return (
    <CardItemGroup
      className="db-chips-row"
      style={{ marginTop: 0, paddingTop: 0 }}
    >
      <Separator orientation="horizontal" style={{ height: 0.5, margin: 0 }} />
      <CardItemGroup orientation="horizontal">
        <SortRuleChips />
        {filterRuleCount > 0 && sortCount > 0 && (
          <>
            <Spacer orientation="horizontal" size={5} />
            <Separator orientation="vertical" />
            <Spacer orientation="horizontal" size={5} />
          </>
        )}
        <FilterRuleChips />
      </CardItemGroup>
    </CardItemGroup>
  );
}
