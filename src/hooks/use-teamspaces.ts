import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Teamspace, TeamspaceAccess, ID, Person, Page } from "../types";
import { queryKeys } from "../lib/queryKeys";
import {
  fetchTeamspaces,
  fetchTeamspace,
  patchTeamspace,
} from "../api/teamspaces";
import { patchPage } from "../api/pages";
import { usePeopleBase } from "./use-people";
import { usePatchTeamspace } from "./use-patch-teamspace";
import { usePatchPage } from "./use-patch-page";
import { useDeleteTeamspace } from "./use-delete-teamspace";
import { useCreateTeamspace } from "./use-create-teamspace";
import { useCreatePage } from "./use-create-page";
import { buildTeamspacePair } from "./use-create-teamspace-with-page";
import { useCurrentWorkspace } from "./use-workspaces";
import { useCurrentPerson } from "./use-session";
import { usePagesByCategory } from "./use-pages";
import {
  useAddTeamspaceMember,
  useRemoveTeamspaceMember,
} from "./use-teamspace-members";

function useTeamspacesBase<T>(select?: (teamspaces: Teamspace[]) => T) {
  const { workspaceId } = useCurrentWorkspace();
  return useQuery({
    queryKey: queryKeys.teamspaces.lists(workspaceId ?? ""),
    queryFn: fetchTeamspaces,
    enabled: !!workspaceId,
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
// Admin adapter for the settings screen. `teamspaces` = only those HOSTED by
// the current workspace (joined ones aren't yours to manage).
//
// Membership (member_ids / owner_ids) can no longer be patched directly — a
// guard trigger rejects it — so add/remove go through the membership RPCs,
// which check the caller is an owner. Rename/access/description/groups are
// ordinary owner edits and still use the patch path.
// ─────────────────────────────────────────────────────────────────────────────

export function useManageTeamspaces() {
  const { data: allTeamspaces = [] } = useTeamspacesBase();
  const { data: teamspacePages = [] } = usePagesByCategory("Teamspaces");
  const { workspaceId } = useCurrentWorkspace();
  const { person } = useCurrentPerson();

  const teamspaces = useMemo(() => {
    const pageById = new Map((teamspacePages as Page[]).map((p) => [p.id, p]));
    return (allTeamspaces as Teamspace[]).filter(
      (t) => pageById.get(t.id)?.workspaceId === workspaceId,
    );
  }, [allTeamspaces, teamspacePages, workspaceId]);

  const patch = usePatchTeamspace(({ id, patch }) => patchTeamspace(id, patch));
  const patchPageMut = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const del = useDeleteTeamspace();
  const createRecord = useCreateTeamspace();
  const createPageMut = useCreatePage();
  const addMember = useAddTeamspaceMember();
  const removeMember = useRemoveTeamspaceMember();

  const byId = (id: ID) => teamspaces.find((t) => t.id === id);

  return {
    teamspaces,

    addTeamspaceAsync: async (args: {
      name: string;
      iconName?: string | null;
      iconColor?: string | null;
      description?: string | null;
      access?: TeamspaceAccess;
    }) => {
      if (!person || !workspaceId) {
        throw new Error("Cannot create a teamspace before the session loads");
      }
      const { page, record } = buildTeamspacePair({
        name: args.name,
        iconName: args.iconName ?? null,
        iconColor: args.iconColor ?? null,
        description: args.description ?? null,
        access: args.access ?? "open",
        ownerId: person.id,
        workspaceId,
      });
      await createRecord.mutateAsync(record);
      try {
        await createPageMut.mutateAsync(page);
      } catch (err) {
        try {
          await del.mutateAsync(record.id);
        } catch {
          /* best-effort rollback */
        }
        throw err;
      }
      return { page, teamspace: record };
    },

    renameTeamspaceAsync: (id: ID, name: string) =>
      patchPageMut.mutateAsync({ id, patch: { title: name } }),

    setAccessAsync: (id: ID, access: TeamspaceAccess) =>
      patch.mutateAsync({ id, patch: { access } }),

    setDescriptionAsync: (id: ID, description: string | null) =>
      patch.mutateAsync({ id, patch: { description } }),

    deleteTeamspaceAsync: (id: ID) => del.mutateAsync(id),

    // Membership → RPCs (owner-checked server-side).
    addMemberAsync: (id: ID, personId: ID) => {
      const ts = byId(id);
      if (!ts || ts.memberIds.includes(personId)) return Promise.resolve();
      return addMember.mutateAsync({ teamspaceId: id, personId });
    },

    removeMemberAsync: (id: ID, personId: ID) =>
      removeMember.mutateAsync({ teamspaceId: id, personId }),

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
