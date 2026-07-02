import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Page } from "../types";
import { createPage } from "../api/pages";
import { queryKeys } from "../lib/queryKeys";

export const createPageMutationKey = ["pages", "create"] as const;

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: createPageMutationKey,
    mutationFn: (page: Page) => {
      return createPage(page);
    },
    onMutate: async (page: Page) => {
      await qc.cancelQueries({ queryKey: queryKeys.pages.all });

      const previousPageList = qc.getQueriesData<Page[]>({
        queryKey: queryKeys.pages.lists(),
      });

      qc.setQueriesData<Page[]>(
        { queryKey: queryKeys.pages.lists() },
        (pages) => (pages ? [...pages, page] : pages),
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
