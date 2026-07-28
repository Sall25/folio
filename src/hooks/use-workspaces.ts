import { useQuery } from "@tanstack/react-query";
import type { Workspace, WorkspaceSettings, ID } from "../types";
import { queryKeys } from "../lib/queryKeys";
import {
  fetchWorkspaces,
  fetchWorkspace,
  patchWorkspace,
} from "../api/workspaces";
import { usePatchWorkspace } from "./use-patch-workspace";

function useWorkspacesBase<T>(select?: (workspaces: Workspace[]) => T) {
  return useQuery({
    queryKey: queryKeys.workspaces.lists(),
    queryFn: fetchWorkspaces,
    select,
  });
}

export function useWorkspaces() {
  return useWorkspacesBase();
}

export function useWorkspace(id: ID | null) {
  return useQuery({
    queryKey: queryKeys.workspaces.detail(id ?? ""),
    queryFn: () => fetchWorkspace(id!),
    enabled: id != null,
  });
}

// Folio ships single-workspace: there is exactly one. This resolves it without
// the caller needing to know its id — the first (and only) workspace in the
// list. When multi-workspace arrives, replace this with a "current workspace"
// selection (from a context/route), and the rest of the app that reads
// useCurrentWorkspace() keeps working.
export function useCurrentWorkspace() {
  const query = useWorkspacesBase((list) => list[0] ?? null);
  return {
    workspace: query.data ?? null,
    workspaceId: query.data?.id ?? null,
    isPending: query.isPending,
    isError: query.isError,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin adapter — the fat (id, x) => Promise API the settings screen calls, on
// top of the granular query + mutation hooks. Mirrors useManageTeamspaces.
//
// settings is a jsonb blob replaced whole on patch, so partial settings changes
// read the current settings, merge, and write the complete object back — this
// is why setSettingAsync needs the current workspace in scope.
// ─────────────────────────────────────────────────────────────────────────────

export function useManageWorkspace() {
  const { workspace } = useCurrentWorkspace();
  const patch = usePatchWorkspace(({ id, patch }) => patchWorkspace(id, patch));

  return {
    workspace,

    renameAsync: (id: ID, name: string) =>
      patch.mutateAsync({ id, patch: { name } }),

    setIconAsync: (id: ID, icon: string | null) =>
      patch.mutateAsync({ id, patch: { icon } }),

    // Replace the ENTIRE settings object. Callers that already hold a full
    // WorkspaceSettings use this directly.
    setSettingsAsync: (id: ID, settings: WorkspaceSettings) =>
      patch.mutateAsync({ id, patch: { settings } }),

    // Patch ONE settings field. Reads current settings, merges the single key,
    // writes the whole object back (settings is stored as one jsonb blob, so
    // there's no per-field column to PATCH). No-ops if the workspace isn't
    // loaded yet.
    setSettingAsync: <K extends keyof WorkspaceSettings>(
      id: ID,
      key: K,
      value: WorkspaceSettings[K],
    ) => {
      if (!workspace) return Promise.resolve();
      return patch.mutateAsync({
        id,
        patch: { settings: { ...workspace.settings, [key]: value } },
      });
    },
  };
}
