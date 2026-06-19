import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Page } from "../types";
import { createPage } from "../api/pages";
import { queryKeys } from "../lib/queryKeys";

export function useAddRow() {
  const qc = useQueryClient();

  return useMutation({
    // a row is a page — created via the same endpoint
    mutationFn: (row: Page) => createPage(row),

    onMutate: async (row: Page) => {
      await qc.cancelQueries({ queryKey: queryKeys.pages.all });

      const previousPageList = qc.getQueriesData<Page[]>({
        queryKey: queryKeys.pages.lists(),
      });

      qc.setQueriesData<Page[]>(
        { queryKey: queryKeys.pages.lists() },
        (pages) => (pages ? [...pages, row] : pages),
      );

      return { previousPageList };
    },

    onError: (_error, _vars, ctx) => {
      ctx?.previousPageList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pages.all });
    },
  });
}
