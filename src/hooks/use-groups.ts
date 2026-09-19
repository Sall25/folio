import { useQuery } from "@tanstack/react-query";

import type { Group, Person, ID } from "../types";

import { queryKeys } from "../lib/queryKeys";

import { fetchGroups, fetchGroup, patchGroup } from "../api/groups";

import { usePeopleBase } from "./use-people";
import { useCurrentPerson } from "./use-session";

import { useCreateGroup } from "./use-create-group";
import { usePatchGroup } from "./use-patch-group";
import { useDeleteGroup } from "./use-delete-group";

function useGroupsBase<T>(select?: (groups: Group[]) => T) {
  const { person, isLoading: personLoading } = useCurrentPerson();

  const workspaceId = person?.workspaceId;

  return useQuery({
    queryKey: queryKeys.groups.lists(workspaceId ?? ""),
    queryFn: () => fetchGroups(workspaceId!),
    enabled: !personLoading && !!workspaceId,
    select,
  });
}

export function useGroups() {
  return useGroupsBase();
}

export function useGroup(id: ID | null) {
  return useQuery({
    queryKey: queryKeys.groups.detail(id ?? ""),
    queryFn: () => fetchGroup(id!),
    enabled: id != null,
  });
}

// ─── CROSS-CACHE: the people who belong to a group ──────────────────────────

export function usePeopleInGroup(groupId: ID | null) {
  const groupQuery = useGroupsBase((groups) =>
    groups.find((g) => g.id === groupId),
  );

  const peopleQuery = usePeopleBase();

  const group = groupQuery.data;
  const people = peopleQuery.data as Person[];

  const members: Person[] =
    group && people
      ? (() => {
          const byId = new Map(people.map((p) => [p.id, p]));

          return group.memberIds
            .map((mid) => byId.get(mid))
            .filter((p): p is Person => p !== undefined);
        })()
      : [];

  return {
    members,
    isPending: groupQuery.isPending || peopleQuery.isPending,
    isError: groupQuery.isError || peopleQuery.isError,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin adapter — re-exposes the fat (id, x) => Promise API the people/groups
// settings screen calls, over the granular query + mutation hooks.
// Member operations read the current group to append/filter its memberIds,
// then PATCH.
// ─────────────────────────────────────────────────────────────────────────────

function makeGroup(args: { name: string; workspaceId: ID }): Group {
  return {
    id: crypto.randomUUID(),
    name: args.name,
    icon: null,
    memberIds: [],
    createdAt: Date.now(),
    workspaceId: args.workspaceId,
  };
}

export function useManageGroups() {
  const { person, isLoading: personLoading } = useCurrentPerson();

  const { data: groups = [] } = useGroupsBase();

  const create = useCreateGroup();
  const patch = usePatchGroup(({ id, patch }) => patchGroup(id, patch));
  const del = useDeleteGroup();

  const workspaceId = person?.workspaceId;

  const byId = (id: ID) => (groups as Group[]).find((g) => g.id === id);

  return {
    groups,

    addGroupAsync: (args: { name: string }) => {
      if (personLoading || !workspaceId) {
        return Promise.reject(
          new Error("Cannot create a group without a workspace"),
        );
      }

      return create.mutateAsync(
        makeGroup({
          name: args.name,
          workspaceId,
        }),
      );
    },

    renameGroupAsync: (id: ID, name: string) =>
      patch.mutateAsync({
        id,
        patch: { name },
      }),

    deleteGroupAsync: (id: ID) => del.mutateAsync(id),

    addMemberAsync: (groupId: ID, personId: ID) => {
      const g = byId(groupId);

      if (!g) return Promise.resolve();

      if (g.memberIds.includes(personId)) {
        return Promise.resolve(g);
      }

      return patch.mutateAsync({
        id: groupId,
        patch: {
          memberIds: [...g.memberIds, personId],
        },
      });
    },

    removeMemberAsync: (groupId: ID, personId: ID) => {
      const g = byId(groupId);

      if (!g) return Promise.resolve();

      return patch.mutateAsync({
        id: groupId,
        patch: {
          memberIds: g.memberIds.filter((p) => p !== personId),
        },
      });
    },
  };
}
