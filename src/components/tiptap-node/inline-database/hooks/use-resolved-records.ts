import { useMemo } from "react";
import type { DataSource, Page } from "src/types";
import type { UseDatabaseReturn } from "./use-database";
import { recordMatchesFilters } from "../utils/apply-filters";
import { sortRecords } from "../utils/apply-sorts";

// filter → search → sort → pin-editing

export function useResolvedRecords(
  resolvedRecords: Page[],
  source: DataSource | null,
  db: UseDatabaseReturn,
  editingRecordId: string | null,
): Page[] {
  const activeView = db.activeView;

  return useMemo(() => {
    const props = source?.properties ?? [];

    const filtered = activeView?.filters?.length
      ? resolvedRecords.filter((r) =>
          recordMatchesFilters(r, activeView.filters, props),
        )
      : resolvedRecords;

    const q = db.searchQuery.trim().toLowerCase();
    const searched = q
      ? filtered.filter((r) => (r.title ?? "").toLowerCase().includes(q))
      : filtered;

    const sorted = sortRecords(searched, activeView?.sorts ?? [], props);

    // Pin the row being created to the end so it doesn't jump under the active
    // sort while its title is still changing.
    if (!editingRecordId) return sorted;
    const idx = sorted.findIndex((r) => r.id === editingRecordId);
    if (idx === -1) return sorted;
    return [...sorted.slice(0, idx), ...sorted.slice(idx + 1), sorted[idx]];
  }, [
    editingRecordId,
    resolvedRecords,
    activeView,
    source?.properties,
    db.searchQuery,
  ]);
}
