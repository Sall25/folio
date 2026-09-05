import { useMemo } from "react";
import type { DataSource, Page, ListView } from "src/types";
import type { UseDatabaseReturn } from "./use-database";
import { buildGroupedRows } from "../utils/group-rows";
import { groupRecords } from "../utils/group-records";

// (grouping + row slots/headers) for the LIST view — no per-group column strip.
export function useListLayout(
  sortedRecords: Page[],
  source: DataSource | null,
  db: UseDatabaseReturn,
) {
  const activeView = db.activeView;

  const groupByPropertyId =
    activeView?.type === "list"
      ? ((activeView as ListView).groupByPropertyId ?? null)
      : null;

  const groupProp = groupByPropertyId
    ? source?.properties.find((p) => p.id === groupByPropertyId)
    : undefined;

  const collapsedKeys = useMemo(
    () => new Set((activeView as ListView)?.collapsedGroups ?? []),
    [activeView],
  );

  const listLayout = useMemo(() => {
    if (!groupProp) {
      return { rowSlots: sortedRecords.map((r) => r.id), headers: [] };
    }
    return buildGroupedRows<"list">(
      "list",
      groupRecords(sortedRecords, groupProp),
      collapsedKeys,
      (activeView as ListView)?.showEmptyGroups ?? false,
    );
  }, [sortedRecords, groupProp, collapsedKeys, activeView]);

  return { listLayout, groupProp };
}
