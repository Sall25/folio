import type { ID } from "src/types";
import { restorePage, trashPage } from "src/api/pages-trash";
import { sendLocalPage } from "src/lib/local-pages";

// Moving pages to the trash and back, the server part: the keys and
// functions shared by the hooks (use-trash-page.ts, use-trash.ts) and by
// App.tsx, which gives them to writes queued offline and restored after a
// reload. Kept light: App.tsx loads before sign-in.

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
