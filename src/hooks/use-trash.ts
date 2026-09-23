import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTrashedPages,
  restorePage,
  deletePagePermanently,
  emptyTrash,
} from "src/api/pages-trash";
import type { ID, Page } from "src/types";
import { queryKeys } from "src/lib/queryKeys";
import { useCurrentSpace } from "./use-current-space";
import { useCurrentWorkspace } from "./use-workspaces";
import { useCurrentPerson } from "./use-session";

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

// Trashed pages in the current space. Keyed per space so switching spaces or
// workspaces never shows another space's trash.
export function useTrashedPages() {
  const { scopeKey, inScope, ready } = useTrashScope();
  return useQuery({
    queryKey: [...TRASH_KEY, scopeKey],
    queryFn: () => fetchTrashedPages(inScope),
    enabled: ready,
  });
}

// Trash and page lists both change on any of these, across every scope.
function useInvalidateTrash() {
  const qc = useQueryClient();
  return useCallback(() => {
    qc.invalidateQueries({ queryKey: TRASH_KEY });
    qc.invalidateQueries({ queryKey: queryKeys.pages.all });
  }, [qc]);
}

export function useRestorePage() {
  const invalidate = useInvalidateTrash();
  return useMutation({
    mutationFn: (pageId: ID) => restorePage(pageId),
    onSuccess: invalidate,
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
