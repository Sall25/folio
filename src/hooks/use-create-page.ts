import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Page } from "../types";
import { createPage } from "../api/pages";
import { queryKeys } from "../lib/queryKeys";
import { addLocalPage, removeLocalPage } from "src/lib/local-pages";
import { pageWritesScope } from "./use-patch-page";

export const createPageMutationKey = ["pages", "create"] as const;

/** `quiet`: a page made without leaving the open one (a page link inserted
 *  from the slash menu). The editor isn't covered while it saves; see
 *  page-editor-layout.tsx. */
export function useCreatePage({ quiet = false }: { quiet?: boolean } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: createPageMutationKey,
    meta: quiet ? { quiet: true } : undefined,
    // In order with the page's later patches (use-patch-page.ts): a rename
    // never reaches the server before the page exists.
    scope: pageWritesScope,
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

      // The `.all` prefix matches BOTH list entries (Page[]) and detail
      // entries (a single Page). Only push onto arrays — spreading a
      // page-detail object threw "pages is not iterable".
      qc.setQueriesData<Page[]>({ queryKey: queryKeys.pages.all }, (pages) =>
        Array.isArray(pages) ? [...pages, page] : pages,
      );
      qc.setQueryData(queryKeys.pages.detail(page.id), page);

      qc.setQueryData(["page-role", page.id], "full");
    },
    // Take out THIS page only. Restoring a copy of the whole list (as
    // before) also removed every page created while this request was out:
    // they vanished until the next refetch brought them back.
    onError: (_error, vars) => {
      removeLocalPage(vars.id);
      qc.setQueriesData<Page[]>({ queryKey: queryKeys.pages.all }, (pages) =>
        Array.isArray(pages) ? pages.filter((p) => p.id !== vars.id) : pages,
      );
      qc.removeQueries({ queryKey: queryKeys.pages.detail(vars.id) });
    },
    onSettled: () => {
      // Another page write still queued: refetching now would show the
      // server's list before it lands.
      if (qc.isMutating({ mutationKey: ["pages"] }) > 1) return;
      void qc.invalidateQueries({ queryKey: queryKeys.pages.all });
    },
  });
}
