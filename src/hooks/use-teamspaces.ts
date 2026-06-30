import { useQuery } from "@tanstack/react-query";
import type { Teamspace, TeamspaceAccess, ID, Person } from "../types";
import { queryKeys } from "../lib/queryKeys";
import {
  fetchTeamspaces,
  fetchTeamspace,
  patchTeamspace,
} from "../api/teamspaces";
import { usePeopleBase } from "./use-people";
import { usePatchTeamspace } from "./use-patch-teamspace";
import { useDeleteTeamspace } from "./use-delete-teamspace";
import { useCreateTeamspace } from "./use-create-teamspace";

function useTeamspacesBase<T>(select?: (teamspaces: Teamspace[]) => T) {
  return useQuery({
    queryKey: queryKeys.teamspaces.lists(),
    queryFn: fetchTeamspaces,
    select,
  });
}

export function useTeamspaces() {
  return useTeamspacesBase();
}

export function useTeamspace(id: ID | null) {
  return useQuery({
    queryKey: queryKeys.teamspaces.detail(id ?? ""),
    queryFn: () => fetchTeamspace(id!),
    enabled: id != null,
  });
}

// generic resolver: id list + entity list → entities, order-preserving
function resolveIds<T extends { id: ID }>(ids: ID[], entities: T[]): T[] {
  const byId = new Map(entities.map((e) => [e.id, e]));
  return ids.map((id) => byId.get(id)).filter((e): e is T => e !== undefined);
}

export function useTeamspaceMembers(teamspaceId: ID | null) {
  const tsQuery = useTeamspacesBase((ts) =>
    ts.find((t) => t.id === teamspaceId),
  );
  const peopleQuery = usePeopleBase();
  const members =
    tsQuery.data && peopleQuery.data
      ? resolveIds(tsQuery.data.memberIds, peopleQuery.data as Person[])
      : [];
  return {
    members,
    isPending: tsQuery.isPending || peopleQuery.isPending,
    isError: tsQuery.isError || peopleQuery.isError,
  };
}

export function useTeamspaceOwners(teamspaceId: ID | null) {
  const tsQuery = useTeamspacesBase((ts) =>
    ts.find((t) => t.id === teamspaceId),
  );
  const peopleQuery = usePeopleBase();
  const owners =
    tsQuery.data && peopleQuery.data
      ? resolveIds(tsQuery.data.ownerIds, peopleQuery.data as Person[])
      : [];
  return {
    owners,
    isPending: tsQuery.isPending || peopleQuery.isPending,
    isError: tsQuery.isError || peopleQuery.isError,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin adapter — re-exposes the fat (id, x) => Promise API the settings screen
// calls, on top of the granular query + mutation hooks. Member/group ops read
// the current list to append/filter the right array, then PATCH it.
// ─────────────────────────────────────────────────────────────────────────────

// NOTE: swap crypto.randomUUID() for your own id helper if you have one, and
// tune the defaults (access "open", empty owners) to taste.
function makeTeamspace(args: { name: string }): Teamspace {
  return {
    id: crypto.randomUUID(),
    name: args.name,
    icon: null,
    description: null,
    access: "open",
    memberIds: [],
    groupIds: [],
    ownerIds: [],
    createdAt: Date.now(),
  };
}

export function useManageTeamspaces() {
  const { data: teamspaces = [] } = useTeamspacesBase();

  const patch = usePatchTeamspace(({ id, patch }) => patchTeamspace(id, patch));
  const del = useDeleteTeamspace();
  const create = useCreateTeamspace();

  const byId = (id: ID) => (teamspaces as Teamspace[]).find((t) => t.id === id);

  return {
    teamspaces,

    addTeamspaceAsync: (args: { name: string }) =>
      create.mutateAsync(makeTeamspace(args)),

    renameTeamspaceAsync: (id: ID, name: string) =>
      patch.mutateAsync({ id, patch: { name } }),

    setAccessAsync: (id: ID, access: TeamspaceAccess) =>
      patch.mutateAsync({ id, patch: { access } }),

    deleteTeamspaceAsync: (id: ID) => del.mutateAsync(id),

    addMemberAsync: (id: ID, personId: ID) => {
      const ts = byId(id);
      if (!ts) return Promise.resolve();
      if (ts.memberIds.includes(personId)) return Promise.resolve(ts);
      return patch.mutateAsync({
        id,
        patch: { memberIds: [...ts.memberIds, personId] },
      });
    },

    removeMemberAsync: (id: ID, personId: ID) => {
      const ts = byId(id);
      if (!ts) return Promise.resolve();
      return patch.mutateAsync({
        id,
        patch: { memberIds: ts.memberIds.filter((p) => p !== personId) },
      });
    },

    attachGroupAsync: (id: ID, groupId: ID) => {
      const ts = byId(id);
      if (!ts) return Promise.resolve();
      if (ts.groupIds.includes(groupId)) return Promise.resolve(ts);
      return patch.mutateAsync({
        id,
        patch: { groupIds: [...ts.groupIds, groupId] },
      });
    },

    detachGroupAsync: (id: ID, groupId: ID) => {
      const ts = byId(id);
      if (!ts) return Promise.resolve();
      return patch.mutateAsync({
        id,
        patch: { groupIds: ts.groupIds.filter((g) => g !== groupId) },
      });
    },
  };
}
