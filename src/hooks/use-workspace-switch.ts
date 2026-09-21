import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ID } from "src/types";
import { queryKeys } from "src/lib/queryKeys";
import { queryKeys as sessionQueryKeys } from "src/hooks/use-session";
import { createWorkspaceRpc, switchWorkspaceRpc } from "src/api/workspaces";

// Switching or creating a workspace changes people.workspace_id, which changes
// the scope of nearly everything: which people, pages, teamspaces, groups the
// current user sees. So after either op we invalidate every workspace-scoped
// query so the app refetches under the new scope. We reset (remove) rather
// than just invalidate the workspace-scoped LISTS, so stale old-workspace data
// can't flash before the refetch lands.
function invalidateWorkspaceScopedData(qc: ReturnType<typeof useQueryClient>) {
  // The current person's record (its workspace_id just changed) — refetch so
  // useCurrentWorkspace/usePlan/everything downstream re-resolves.
  qc.invalidateQueries({ queryKey: sessionQueryKeys.currentPerson });
  qc.invalidateQueries({ queryKey: sessionQueryKeys.session });

  // Workspace list + the workspace-scoped domains. Remove (not just
  // invalidate) the scoped lists so the previous workspace's cached rows
  // don't render for a frame under the new workspace before refetch.
  qc.removeQueries({ queryKey: queryKeys.people.all });
  qc.removeQueries({ queryKey: queryKeys.pages.all });
  qc.removeQueries({ queryKey: queryKeys.teamspaces.all });
  qc.removeQueries({ queryKey: queryKeys.groups.all });
  qc.removeQueries({ queryKey: queryKeys.dataSources.all });

  qc.invalidateQueries({ queryKey: queryKeys.workspaces.all });
}

/**
 * Create a new workspace (owned by the caller) and switch into it. Atomic
 * server-side via the create_workspace RPC. Returns the new workspace id.
 */
export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createWorkspaceRpc(name),
    onSuccess: () => {
      invalidateWorkspaceScopedData(qc);
    },
  });
}

/**
 * Switch the caller's membership into an existing workspace they own.
 */
export function useSwitchWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetWorkspaceId: ID) =>
      switchWorkspaceRpc(targetWorkspaceId),
    onSuccess: () => {
      invalidateWorkspaceScopedData(qc);
    },
  });
}
