import { useQuery } from "@tanstack/react-query";
import type { Workspace, WorkspaceSettings, WorkspacePlan, ID } from "../types";
import { queryKeys } from "../lib/queryKeys";
import {
  fetchWorkspaces,
  fetchWorkspace,
  patchWorkspace,
} from "../api/workspaces";
import { usePatchWorkspace } from "./use-patch-workspace";
import { useCurrentPerson } from "./use-session";

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

export function useCurrentWorkspace() {
  const { person } = useCurrentPerson();
  const query = useWorkspacesBase((list) => {
    if (!list.length) return null;
    const mine = person
      ? list.find((w) => w.id === person.workspaceId)
      : undefined;
    // Fall back to list[0] only if the person's workspace isn't in the list
    // yet (e.g. mid-refetch right after a switch) — better than null.
    return mine ?? list[0];
  });
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

    setIconAsync: (id: ID, icon: string | null, iconColor?: string | null) =>
      patch.mutateAsync({ id, patch: { icon, iconColor: iconColor ?? null } }),

    // Set the workspace's plan. Right now you'd call this from a manual admin
    // path (or just edit the column in SQL); later a Stripe webhook handler
    // calls the same thing. Every limit check reads the resulting `plan`
    // value and doesn't care who wrote it.
    //
    // NOTE: for this to actually persist from the client, an RLS UPDATE policy
    // must ALLOW writing `plan` — and you almost certainly do NOT want that
    // (a user could self-upgrade to pro for free). Keep plan writes server-
    // side only (SQL / service role / webhook). This method exists for a
    // future server-authorized admin surface, not for end users. See note
    // below.
    setPlanAsync: (id: ID, plan: WorkspacePlan) =>
      patch.mutateAsync({ id, patch: { plan } }),

    setSettingsAsync: (id: ID, settings: WorkspaceSettings) =>
      patch.mutateAsync({ id, patch: { settings } }),

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

// All workspaces the current person OWNS — for the switcher. Relies on the
// workspaces SELECT policy allowing owner_id = auth.uid(), so owned-but-not-
// current workspaces are actually returned by fetchWorkspaces.
export function useOwnedWorkspaces() {
  const { person } = useCurrentPerson();
  const query = useWorkspacesBase((list) =>
    person ? list.filter((w) => w.ownerId === person.id) : [],
  );
  return {
    workspaces: query.data ?? [],
    isPending: query.isPending,
  };
}
