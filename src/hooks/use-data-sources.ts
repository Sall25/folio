import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CellValue, DataSource, ID, Page } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { fetchDataSources, fetchDataSource } from "../api/data-sources";
import { computeRollup } from "../lib/compute-rollup";
import { usePagesBase } from "./use-pages";

// We only care about *which* page ids exist, not page contents. Returning a
// plain (sorted) array lets React Query's structural sharing keep the reference
// stable across unrelated page edits (title/body/values), so data-source
// consumers don't re-render every time any page mutates. Module-level = stable
// reference, so this pages `select` is memoized instead of re-running.
const selectLivePageIds = (pages: Page[]) => pages.map((p) => p.id).sort();

function useDataSourcesBase<T>(select?: (sources: DataSource[]) => T) {
  // Narrow subscription: this only changes when a page is added/removed, not on
  // every page write. (Orphan sources — pageId no longer resolves — get hidden.)
  const { data: livePageIdList } = usePagesBase(selectLivePageIds);

  const livePageIds = useMemo(
    () => (livePageIdList ? new Set(livePageIdList) : null),
    [livePageIdList],
  );

  // Stable `select` reference so React Query memoizes it and doesn't re-run the
  // orphan filter on every render. Only recomputes when the id set or the
  // caller's select actually change.
  const combinedSelect = useCallback(
    (sources: DataSource[]) => {
      // Only filter once pages have loaded; before that don't hide anything
      // (avoids flicker / dropping valid sources while pages are pending).
      const live = livePageIds
        ? sources.filter((s) => s.pageId != null && livePageIds.has(s.pageId))
        : sources;
      return select ? select(live) : (live as T);
    },
    [livePageIds, select],
  );

  return useQuery({
    queryKey: queryKeys.dataSources.lists(),
    queryFn: fetchDataSources,
    select: combinedSelect,
  });
}

export function useDataSources() {
  return useDataSourcesBase();
}

// the database living on a given page (or undefined) — the "is this page a
// container?" read, same check the delete-cascade partition makes
export function useDataSourceByPage(pageId: ID | null) {
  const select = useCallback(
    (sources: DataSource[]) =>
      pageId == null ? undefined : sources.find((s) => s.pageId === pageId),
    [pageId],
  );
  return useDataSourcesBase(select);
}

export function useDataSource(id: ID | null) {
  return useQuery({
    queryKey: queryKeys.dataSources.detail(id ?? ""),
    queryFn: () => fetchDataSource(id!),
    enabled: !!id,
  });
}

// every rollup value for one row: Record<rollupPropertyId, CellValue>
export function useRowRollups(row: Page | undefined) {
  const selectSource = useCallback(
    (sources: DataSource[]) => sources.find((s) => s.id === row?.sourceId),
    [row?.sourceId],
  );
  const sourceQuery = useDataSourcesBase(selectSource);
  const pagesQuery = usePagesBase();

  const source = sourceQuery.data;
  const allPages = pagesQuery.data as Page[];

  const rollups = useMemo(() => {
    const out: Record<ID, CellValue> = {};
    if (row && source && allPages) {
      for (const prop of source.properties) {
        if (prop.config.type === "rollup" && row.values) {
          out[prop.id] = computeRollup({
            record: { values: row.values },
            properties: source.properties,
            targetSource: source,
            config: prop.config,
            pages: allPages,
          });
        }
      }
    }
    return out;
  }, [row, source, allPages]);

  return {
    rollups,
    isPending: sourceQuery.isPending || pagesQuery.isPending,
    isError: sourceQuery.isError || pagesQuery.isError,
  };
}
