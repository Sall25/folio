import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Page } from "../types";
import { createPage } from "../api/pages";
import { queryKeys } from "../lib/queryKeys";
import { addLocalPage, removeLocalPage } from "src/lib/local-pages";

export const createPageMutationKey = ["pages", "create"] as const;

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: createPageMutationKey,
    mutationFn: async (page: Page) => {
      try {
        const saved = await createPage(page);
        removeLocalPage(page.id);
        return saved;
      } catch (error) {
        // No connection: it stays in the outbox, PageOutboxSync sends it.
        if (!navigator.onLine || error instanceof TypeError) return page;
        throw error;
      }
    },
    onMutate: async (page: Page) => {
      addLocalPage(page);
      await qc.cancelQueries({ queryKey: queryKeys.pages.all });

      const previousPageList = qc.getQueriesData<Page[]>({
        queryKey: queryKeys.pages.all,
      });

      // The `.all` prefix matches BOTH list entries (Page[]) and detail
      // entries (a single Page). Only push onto arrays — spreading a
      // page-detail object threw "pages is not iterable".
      qc.setQueriesData<Page[]>({ queryKey: queryKeys.pages.all }, (pages) =>
        Array.isArray(pages) ? [...pages, page] : pages,
      );
      qc.setQueryData(queryKeys.pages.detail(page.id), page);

      qc.setQueryData(["page-role", page.id], "full");

      return { previousPageList };
    },
    onError: (_error, vars, ctx) => {
      removeLocalPage(vars.id);
      ctx?.previousPageList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pages.all });
    },
  });
}
