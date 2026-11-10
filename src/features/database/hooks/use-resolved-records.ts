import { useMemo } from "react";
import { rowMatchesSearch } from "../utils/row-summary";
import type { DataSource, Page } from "src/types";
import type { UseDatabaseReturn } from "./use-database";
import { recordMatchesFilters } from "../utils/apply-filters";
import { useSession } from "src/hooks/use-session";
import { sortRecords } from "../utils/apply-sorts";
import { usePageTitles } from "./use-page-titles";
import { applyManualOrder } from "../utils/manual-order";
import {
  assigneeProperty,
  countAssignees,
  matchesPeopleFilter,
  type AssigneeCounts,
} from "../utils/assignee";

// filter → search → people bar → sort (or a table / list's own row order)
// → pin-editing

export interface ResolvedRecords {
  records: Page[];
  /** Rows per assignee after the view's filters and the search, before the
   *  people bar's own filter (so its counts don't collapse when you pick
   *  someone). Null when the database has no person property. */
  peopleCounts: AssigneeCounts | null;
}

export function useResolvedRecords(
  resolvedRecords: Page[],
  source: DataSource | null,
  db: UseDatabaseReturn,
  editingRecordId: string | null,
): ResolvedRecords {
  const activeView = db.activeView;
  // For the "Me" person filter.
  const meId = useSession().session?.user.id ?? null;
  // For relation filters and sorts, which go by the linked pages' titles.
  const titleOf = usePageTitles();

  return useMemo(() => {
    const props = source?.properties ?? [];

    const filtered = activeView?.filters?.length
      ? resolvedRecords.filter((r) =>
          recordMatchesFilters(r, activeView.filters, props, { meId, titleOf }),
        )
      : resolvedRecords;

    const q = db.searchQuery.trim().toLowerCase();
    const searched = q
      ? filtered.filter((r) => rowMatchesSearch(r, q, props))
      : filtered;

    const assignee = assigneeProperty(props);
    const peopleCounts = assignee
      ? countAssignees(searched.map((r) => r.values?.[assignee.id]))
      : null;
    const picked = assignee && !activeView?.hidePeopleBar ? db.personFilter : [];
    const peopled = picked.length
      ? searched.filter((r) =>
          matchesPeopleFilter(r.values?.[assignee!.id], picked),
        )
      : searched;

    const sorts = activeView?.sorts ?? [];
    // A table or list without a sort keeps the order its rows were dragged
    // into (manual-order.ts). A sort always wins.
    const sorted =
      sorts.length === 0 &&
      (activeView?.type === "table" || activeView?.type === "list")
        ? applyManualOrder(peopled, activeView.manualOrder)
        : sortRecords(peopled, sorts, props, { titleOf });

    // Pin the row being created to the end so it doesn't jump under the active
    // sort while its title is still changing.
    const pinned = (() => {
      if (!editingRecordId) return sorted;
      const idx = sorted.findIndex((r) => r.id === editingRecordId);
      if (idx === -1) return sorted;
      return [...sorted.slice(0, idx), ...sorted.slice(idx + 1), sorted[idx]];
    })();
    return { records: pinned, peopleCounts };
  }, [
    editingRecordId,
    meId,
    titleOf,
    resolvedRecords,
    activeView,
    source?.properties,
    db.searchQuery,
    db.personFilter,
  ]);
}
