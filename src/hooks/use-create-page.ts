import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Page } from "../types";
import { createPage } from "../api/pages";
import { queryKeys } from "../lib/queryKeys";
import { addLocalPage, removeLocalPage } from "src/lib/local-pages";

export const createPageMutationKey = ["pages", "create"] as const;

/** `quiet`: a page made without leaving the open one (a page link inserted
 *  from the slash menu). The editor isn't covered while it saves; see
 *  page-editor-layout.tsx. */
export function useCreatePage({ quiet = false }: { quiet?: boolean } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: createPageMutationKey,
    meta: quiet ? { quiet: true } : undefined,
    // Runs even offline: with no connection the page is made here at once
    // and stays in the outbox (local-pages.ts) for PageOutboxSync to send.
    // React Query's default held it until the connection came back, so
    // "New page" did nothing offline (the page never opened and the editor
    // stayed covered). Not in the page writes' queue either, which could
    // hold it behind a rename waiting for the connection: a later change to
    // the page sends it first instead (sendLocalPage, use-patch-page.ts).
    networkMode: "always",
    mutationFn: async (page: Page) => {
      try {
        const saved = await createPage(page);
        removeLocalPage(page.id);
        return saved;
      } catch (error) {
        // No connection: it stays in the outbox, PageOutboxSync sends it.
        if (!navigator.onLine || error instanceof TypeError) return page;
        // Already sent by a change to it (sendLocalPage): created.
        if (String(error).includes("duplicate")) {
          removeLocalPage(page.id);
          return page;
        }
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
