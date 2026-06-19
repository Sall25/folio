import { useQuery } from "@tanstack/react-query";
import type { CellValue, DataSource, ID, Page } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { fetchDataSources, fetchDataSource } from "../api/data-sources";
import { computeRollup } from "../lib/compute-rollup";
import { usePagesBase } from "./use-pages";

function useDataSourcesBase<T>(select?: (sources: DataSource[]) => T) {
  return useQuery({
    queryKey: queryKeys.dataSources.lists(),
    queryFn: fetchDataSources,
    select,
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
