import { useMemo } from "react";
import type { DataSource, Page, TableView } from "src/types";
import type { UseDatabaseReturn } from "./use-database";
import { buildGroupedRows } from "../utils/group-rows";
import { groupRecords } from "../utils/group-records";

// (grouping + row slots/headers)
export function useTableLayout(
  sortedRecords: Page[],
  source: DataSource | null,
  db: UseDatabaseReturn,
) {
  const activeView = db.activeView;

  const groupByPropertyId =
    activeView?.type === "table"
      ? ((activeView as TableView).groupByPropertyId ?? null)
      : null;

  const groupProp = groupByPropertyId
    ? source?.properties.find((p) => p.id === groupByPropertyId)
    : undefined;

  const collapsedKeys = useMemo(
    () => new Set((activeView as TableView)?.collapsedGroups ?? []),
    [activeView],
  );

  const tableLayout = useMemo(() => {
    if (!groupProp) {
      return { rowSlots: sortedRecords.map((r) => r.id), headers: [] };
    }
    return buildGroupedRows(
      groupRecords(sortedRecords, groupProp),
      collapsedKeys,
      (activeView as TableView)?.showEmptyGroups ?? false,
    );
  }, [sortedRecords, groupProp, collapsedKeys, activeView]);

  return { tableLayout, groupProp };
}
