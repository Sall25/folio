import { useMemo } from "react";
import type { DataSource, ID, Page, TableView } from "src/types";
import type { UseDatabaseReturn } from "./use-database";
import { recordMatchesFilters } from "../utils/apply-filters";
import { sortRecords } from "../utils/apply-sorts";
import { buildGroupedRows } from "../utils/group-rows";
import { groupRecords } from "../utils/group-records";

export function useTableRecords({
  resolvedRecords,
  source,
  db,
  editingRecordId,
}: {
  resolvedRecords: Page[];
  source: DataSource | undefined;
  db: UseDatabaseReturn;
  editingRecordId: ID | null;
}) {
  const activeView = db.activeView;
  const filters = activeView?.filters;
  const sorts = activeView?.sorts;
  const properties = source?.properties;
  const searchQuery = db.searchQuery;

  const sortedRecords = useMemo(() => {
    const props = properties ?? [];
    const filtered = filters?.length
      ? resolvedRecords.filter((r) => recordMatchesFilters(r, filters, props))
      : resolvedRecords;

    const q = searchQuery.trim().toLowerCase();
    const searched = q
      ? filtered.filter((r) => (r.title ?? "").toLowerCase().includes(q))
      : filtered;

    const sorted = sortRecords(searched, sorts ?? [], props);

    // Pin the row being created to the end so it doesn't jump under the sort.
    if (!editingRecordId) return sorted;
    const idx = sorted.findIndex((r) => r.id === editingRecordId);
    if (idx === -1) return sorted;
    return [...sorted.slice(0, idx), ...sorted.slice(idx + 1), sorted[idx]];
  }, [
    editingRecordId,
    resolvedRecords,
    filters,
    sorts,
    properties,
    searchQuery,
  ]);

  const groupByPropertyId = useMemo(
    () =>
      activeView?.type === "table"
        ? ((activeView as TableView).groupByPropertyId ?? null)
        : null,
    [activeView],
  );

  const groupProp = useMemo(
    () =>
      groupByPropertyId
        ? properties?.find((p) => p.id === groupByPropertyId)
        : undefined,
    [properties, groupByPropertyId],
  );

  const collapsedKeys = useMemo(
    () => new Set((activeView as TableView)?.collapsedGroups ?? []),
    [activeView],
  );

  const { rowSlots, headers } = useMemo(() => {
    if (!groupProp)
      return { rowSlots: sortedRecords.map((r) => r.id), headers: [] };
    return buildGroupedRows(
      groupRecords(sortedRecords, groupProp),
      collapsedKeys,
      (activeView as TableView)?.showEmptyGroups ?? false,
    );
  }, [sortedRecords, groupProp, collapsedKeys, activeView]);

  return { sortedRecords, groupProp, collapsedKeys, rowSlots, headers };
}
