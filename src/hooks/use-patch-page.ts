import {
  mutationOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { ID, Page } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { sendLocalPage, updateLocalPage } from "src/lib/local-pages";
import { RETRY_DELAY_MS, retryWhenOffline } from "src/lib/connectivity";

export type PagePatch = Partial<Omit<Page, "id">>;

export const patchPageMutationKey = ["pages", "patch"] as const;

/** Every page write (create, patch) goes out one at a time, in order. Two
 *  saves of a title typed in two goes ("Good", then "Good morning") used to
 *  race: whichever reached the server last won, sometimes the older one. */
export const pageWritesScope = { id: "page-writes" };

type Snapshot = { key: readonly unknown[]; before: Partial<Page> | undefined };

/** The values a patch is about to replace, for each cached copy of the page. */
function snapshotFields(
  qc: QueryClient,
  id: ID,
  patch: PagePatch,
): Snapshot[] {
  const pick = (page: Page | undefined) =>
    page
      ? (Object.fromEntries(
          Object.keys(patch).map((k) => [k, page[k as keyof Page]]),
        ) as Partial<Page>)
      : undefined;
  const out: Snapshot[] = [];
  for (const [key, data] of qc.getQueriesData<Page[] | Page>({
    queryKey: queryKeys.pages.all,
  })) {
    if (Array.isArray(data)) {
      const page = data.find((p) => p.id === id);
      if (page) out.push({ key, before: pick(page) });
    } else if (data && data.id === id) {
      out.push({ key, before: pick(data) });
    }
  }
  return out;
}

export function usePatchPage(
  mutationFn: (args: { id: ID; patch: PagePatch }) => Promise<Page>,
) {
  const qc = useQueryClient();
  return useMutation(patchPageMutationOptions(qc, mutationFn));
}

/** usePatchPage's options, apart from React, so the offline tests run them
 *  on a QueryClient (offline-page-writes.test.ts). */
export function patchPageMutationOptions(
  qc: QueryClient,
  mutationFn: (args: { id: ID; patch: PagePatch }) => Promise<Page>,
) {
  return mutationOptions({
    // Keyed (and with a default mutationFn in App.tsx) so a save made
    // offline survives a reload: it's persisted and resumed.
    mutationKey: patchPageMutationKey,
    scope: pageWritesScope,
    // A lost connection holds the save until it's back instead of undoing
    // it (connectivity.ts).
    retry: retryWhenOffline,
    retryDelay: RETRY_DELAY_MS,
    // A page made offline and not sent yet is sent first: the server can't
    // change a page it doesn't have.
    mutationFn: async (args: { id: ID; patch: PagePatch }) => {
      await sendLocalPage(args.id);
      return mutationFn(args);
    },
    onMutate: async ({ id, patch }: { id: ID; patch: PagePatch }) => {
      // Still waiting to be sent: it'll be created as it is now.
      updateLocalPage(id, patch);
      await qc.cancelQueries({ queryKey: queryKeys.pages.all });

      const before = snapshotFields(qc, id, patch);

      // `.all` matches list entries (Page[]) AND detail entries (single Page).
      // Only .map over arrays — a detail entry isn't iterable/mappable. The
      // detail entry is handled by the explicit setQueryData(detail(id)) below.
      qc.setQueriesData<Page[]>({ queryKey: queryKeys.pages.all }, (old) =>
        Array.isArray(old)
          ? old.map((o) => (o.id === id ? { ...o, ...patch } : o))
          : old,
      );
      qc.setQueryData<Page>(queryKeys.pages.detail(id), (p) =>
        p ? { ...p, ...patch } : p,
      );

      return { before };
    },
    // Undo THIS patch only: the fields it changed, on this page, and only
    // where nothing newer has replaced them since. Restoring a copy of the
    // whole list (as before) also undid every page created or edited while
    // this request was out: they vanished until the next refetch.
    onError: (_error, { id, patch }, ctx) => {
      for (const { key, before } of ctx?.before ?? []) {
        if (!before) continue;
        const undo = (page: Page): Page => {
          const next = { ...page };
          for (const k of Object.keys(before) as (keyof Page)[]) {
            if (page[k] === patch[k as keyof PagePatch]) {
              (next as Record<string, unknown>)[k] = before[k];
            }
          }
          return next;
        };
        qc.setQueryData<Page[] | Page>(key, (data) =>
          Array.isArray(data)
            ? data.map((p) => (p.id === id ? undo(p) : p))
            : data && data.id === id
              ? undo(data)
              : data,
        );
      }
    },
    onSettled: () => {
      // Another page write still queued: refetching now would bring back
      // what the server has before it lands (the older title).
      if (qc.isMutating({ mutationKey: ["pages"] }) > 1) return;
      void qc.invalidateQueries({ queryKey: queryKeys.pages.all });
    },
  });
}
