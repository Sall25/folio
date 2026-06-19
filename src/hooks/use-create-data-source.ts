import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DataSource, Page } from "../types";
import { createDataSource } from "../api/data-sources";
import { fetchPage } from "../api/pages";
import { queryKeys } from "../lib/queryKeys";

export function useCreateDataSource() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (source: DataSource) => {
      // INVARIANT GUARD: a database cannot live on a page that is itself a
      // database row. A row-page has sourceId != null. Reject before creating.
      // This is what guarantees useDeleteDataSource never needs to recurse
      // (row-pages can't be containers).
      const containerPage = await fetchPage(source.pageId);
      if (containerPage.sourceId != null) {
        throw new Error("Cannot create a database inside a database row");
      }
      return createDataSource(source);
    },

    onMutate: async (source: DataSource) => {
      await qc.cancelQueries({ queryKey: queryKeys.dataSources.all });

      const previousSourceList = qc.getQueriesData<DataSource[]>({
        queryKey: queryKeys.dataSources.lists(),
      });

      const cachedPage = qc
        .getQueriesData<Page[]>({ queryKey: queryKeys.pages.lists() })
        .flatMap(([, pages]) => pages ?? [])
        .find((p) => p.id === source.pageId);

      const isRow = cachedPage?.sourceId != null;
      if (!isRow) {
        qc.setQueriesData<DataSource[]>(
          { queryKey: queryKeys.dataSources.lists() },
          (sources) => (sources ? [...sources, source] : sources),
        );
      }

      return { previousSourceList };
    },

    onError: (_error, _vars, ctx) => {
      ctx?.previousSourceList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dataSources.all });
    },
  });
}
