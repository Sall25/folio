import { useQuery } from "@tanstack/react-query";
import type { CellValue, DataSource, ID, Page } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { fetchDataSources, fetchDataSource } from "../api/data-sources";
import { computeRollup } from "../lib/compute-rollup";
import { usePagesBase } from "./use-pages";

function useDataSourcesBase<T>(select?: (sources: DataSource[]) => T) {
  // Live page ids — a source whose pageId no longer resolves to a page is an
  // orphan (its database page was deleted like a regular page, leaving the
  // source behind). Filter those out everywhere sources are read.
  const { data: pages } = usePagesBase();
  const livePageIds = pages
    ? new Set((pages as Page[]).map((p) => p.id))
    : null;

  return useQuery({
    queryKey: queryKeys.dataSources.lists(),
    queryFn: fetchDataSources,
    select: (sources) => {
      // Only filter once pages have loaded; before that, don't hide anything
      // (avoids flicker / dropping valid sources while pages are pending).
      const live = livePageIds
        ? sources.filter((s) => s.pageId != null && livePageIds.has(s.pageId))
        : sources;
      return select ? select(live) : (live as T);
    },
  });
}

export function useDataSources() {
  return useDataSourcesBase();
}

// the database living on a given page (or undefined) — the "is this page a
// container?" read, same check the delete-cascade partition makes
export function useDataSourceByPage(pageId: ID | null) {
  return useDataSourcesBase((sources) =>
    pageId == null ? undefined : sources.find((s) => s.pageId === pageId),
  );
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
  const sourceQuery = useDataSourcesBase((sources) =>
    sources.find((s) => s.id === row?.sourceId),
  );
  const pagesQuery = usePagesBase();

  const source = sourceQuery.data;
  const allPages = pagesQuery.data as Page[];

  const rollups: Record<ID, CellValue> = {};
  if (row && source && allPages) {
    for (const prop of source.properties) {
      if (prop.config.type === "rollup") {
        if (row.values) {
          rollups[prop.id] = computeRollup({
            record: { values: row.values },
            properties: source.properties,
            targetSource: source,
            config: prop.config,
            pages: allPages,
          });
        }
      }
    }
  }

  return {
    rollups,
    isPending: sourceQuery.isPending || pagesQuery.isPending,
    isError: sourceQuery.isError || pagesQuery.isError,
  };
}
