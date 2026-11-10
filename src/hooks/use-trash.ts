import { useCallback } from "react";
import {
  mutationOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { deletePagePermanently, emptyTrash } from "src/api/pages-trash";
import {
  restorePageMutationKey,
  restorePageOnServer,
} from "src/lib/page-writes";
import type { ID, Page } from "src/types";
import { queryKeys } from "src/lib/queryKeys";
import {
  cachedSubtree,
  restoreDeletedAt,
  setCachedDeletedAt,
  type DeletedAtSnapshot,
} from "src/lib/page-trash-cache";
import { useCurrentSpace } from "./use-current-space";
import { useCurrentWorkspace } from "./use-workspaces";
import { useCurrentPerson } from "./use-session";
import { usePagesBase } from "./use-pages";
import { pageWritesScope } from "./use-patch-page";
import { RETRY_DELAY_MS, retryWhenOffline } from "src/lib/connectivity";

const TRASH_KEY = ["trashed-pages"] as const;

// Which trash is "the" trash right now:
//   • workspace → pages HOSTED in your workspace (incl. its own teamspaces,
//     not teamspaces you've joined elsewhere);
//   • teamspace → only that teamspace's pages.
// canPurge: inside a teamspace you can only hard-delete your own pages
// (pages_delete still requires can_write_page). An RLS-denied DELETE removes
// nothing and returns no error, so the UI hides the action instead.
export function useTrashScope() {
  const space = useCurrentSpace();
  const { workspaceId } = useCurrentWorkspace();
  const { person } = useCurrentPerson();
  const teamspaceId = space.kind === "teamspace" ? space.id : null;
  const personId = person?.id ?? null;

  const scopeKey = teamspaceId
    ? `teamspace:${teamspaceId}`
    : `workspace:${workspaceId ?? ""}`;

  const inScope = useCallback(
    (p: Page) =>
      teamspaceId
        ? p.teamspaceId === teamspaceId
        : p.workspaceId === workspaceId,
    [teamspaceId, workspaceId],
  );

  const canPurge = useCallback(
    (p: Page) => (teamspaceId ? p.ownerId === personId : true),
    [teamspaceId, personId],
  );

  return { scopeKey, inScope, canPurge, ready: !!workspaceId };
}

// Trashed pages in the current space, from the page list (which holds
// trashed pages too): it's saved for offline use, and a page moved to the
// trash or back shows here at once, even offline (page-trash-cache.ts).
export function useTrashedPages() {
  const { inScope } = useTrashScope();
  const select = useCallback(
    (pages: Page[]) => pages.filter((p) => p.deletedAt != null && inScope(p)),
    [inScope],
  );
  return usePagesBase(select);
}

// Trash and page lists both change on any of these, across every scope.
function useInvalidateTrash() {
  const qc = useQueryClient();
  return useCallback(() => {
    qc.invalidateQueries({ queryKey: TRASH_KEY });
    qc.invalidateQueries({ queryKey: queryKeys.pages.all });
  }, [qc]);
}

// Takes a page (and the pages inside it) out of the trash. Works offline,
// like moving it there (use-trash-page.ts): back in the sidebar at once,
// sent when the connection is back, in order with the other page writes.
export function useRestorePage() {
  const qc = useQueryClient();
  const invalidate = useInvalidateTrash();
  return useMutation(restorePageMutationOptions(qc, invalidate));
}

/** useRestorePage's options, apart from React, so the offline tests run
 *  them on a QueryClient (offline-page-writes.test.ts). */
export function restorePageMutationOptions(
  qc: QueryClient,
  invalidate: () => void,
) {
  return mutationOptions({
    mutationKey: restorePageMutationKey,
    scope: pageWritesScope,
    // A lost connection holds it until it's back (connectivity.ts).
    retry: retryWhenOffline,
    retryDelay: RETRY_DELAY_MS,
    mutationFn: restorePageOnServer,
    onMutate: async (pageId: ID) => {
      await qc.cancelQueries({ queryKey: queryKeys.pages.all });
      return { before: setCachedDeletedAt(qc, cachedSubtree(qc, pageId), null) };
    },
    onError: (_error, _pageId, ctx?: { before: DeletedAtSnapshot }) => {
      if (ctx) restoreDeletedAt(qc, ctx.before);
    },
    onSettled: () => {
      if (qc.isMutating({ mutationKey: ["pages"] }) > 1) return;
      invalidate();
    },
  });
}

export function useDeletePagePermanently() {
  const invalidate = useInvalidateTrash();
  return useMutation({
    mutationFn: (pageId: ID) => deletePagePermanently(pageId),
    onSuccess: invalidate,
  });
}

// Empties only the CURRENT space's trash, and only what you may purge.
export function useEmptyTrash() {
  const invalidate = useInvalidateTrash();
  const { inScope, canPurge } = useTrashScope();
  return useMutation({
    mutationFn: () => emptyTrash(inScope, canPurge),
    onSuccess: invalidate,
  });
}
