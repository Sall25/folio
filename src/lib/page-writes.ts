import type { QueryClient } from "@tanstack/react-query";
import type { ID, Page } from "src/types";
import { createPage, patchPage } from "src/api/pages";
import { restorePage, trashPage } from "src/api/pages-trash";
import { sendLocalPage } from "src/lib/local-pages";
import { createPageMutationKey } from "src/hooks/use-create-page";
import { patchPageMutationKey } from "src/hooks/use-patch-page";
import { RETRY_DELAY_MS, retryWhenOffline } from "src/lib/connectivity";

// Page writes queued offline: the server part of moving pages to the trash
// and back (shared by use-trash-page.ts and use-trash.ts), and the
// functions every queued page write gets back after a reload
// (setPageWriteDefaults, App.tsx): a paused write is saved with the cache
// without its function. Kept light: App.tsx loads before sign-in.

export const trashPageMutationKey = ["pages", "trash"] as const;
export const restorePageMutationKey = ["pages", "restore"] as const;

export interface TrashPageVars {
  pageId: ID;
  workspaceId: ID;
  /** The page and the pages inside it, as this device knew them. */
  ids?: ID[];
}

/** Pages inside it made offline are sent first (so they're trashed too),
 *  then the page and everything inside it goes to the trash. */
export async function trashPageOnServer({ pageId, ids }: TrashPageVars) {
  for (const id of ids ?? [pageId]) await sendLocalPage(id);
  await trashPage(pageId);
}

export async function restorePageOnServer(pageId: ID) {
  await sendLocalPage(pageId);
  await restorePage(pageId);
}

/** Gives each kind of page write its function, for writes queued offline
 *  and restored after a reload. A change to a page not sent yet sends the
 *  page first. */
export function setPageWriteDefaults(client: QueryClient) {
  // A lost connection holds a write until it's back (connectivity.ts).
  const retry = { retry: retryWhenOffline, retryDelay: RETRY_DELAY_MS };
  client.setMutationDefaults(createPageMutationKey, {
    ...retry,
    mutationFn: (page: Page) => createPage(page),
  });
  client.setMutationDefaults(patchPageMutationKey, {
    ...retry,
    mutationFn: async ({ id, patch }: { id: ID; patch: Partial<Page> }) => {
      await sendLocalPage(id);
      return patchPage(id, patch);
    },
  });
  client.setMutationDefaults(trashPageMutationKey, {
    ...retry,
    mutationFn: trashPageOnServer,
  });
  client.setMutationDefaults(restorePageMutationKey, {
    ...retry,
    mutationFn: restorePageOnServer,
  });
}
