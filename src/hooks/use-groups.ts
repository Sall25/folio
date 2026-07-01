import { useQuery } from "@tanstack/react-query";
import type { Group, Person, ID } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { fetchGroups, fetchGroup, patchGroup } from "../api/groups";
import { usePeopleBase } from "./use-people";
import { useCreateGroup } from "./use-create-group";
import { usePatchGroup } from "./use-patch-group";
import { useDeleteGroup } from "./use-delete-group";

function useGroupsBase<T>(select?: (groups: Group[]) => T) {
  return useQuery({
    queryKey: queryKeys.groups.lists(),
    queryFn: fetchGroups,
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
// settings screen calls, over the granular query + mutation hooks. Member ops
// read the current group to append/filter its memberIds, then PATCH.
// ─────────────────────────────────────────────────────────────────────────────

// NOTE: swap crypto.randomUUID() for your own id helper if you have one.
function makeGroup(args: { name: string }): Group {
  return {
    id: crypto.randomUUID(),
    name: args.name,
    icon: null,
    memberIds: [],
    createdAt: Date.now(),
  };
}

export function useManageGroups() {
  const { data: groups = [] } = useGroupsBase();

  const create = useCreateGroup();
  const patch = usePatchGroup(({ id, patch }) => patchGroup(id, patch));
  const del = useDeleteGroup();

  const byId = (id: ID) => (groups as Group[]).find((g) => g.id === id);

  return {
    groups,

    addGroupAsync: (args: { name: string }) =>
      create.mutateAsync(makeGroup(args)),

    renameGroupAsync: (id: ID, name: string) =>
      patch.mutateAsync({ id, patch: { name } }),

    deleteGroupAsync: (id: ID) => del.mutateAsync(id),

    addMemberAsync: (groupId: ID, personId: ID) => {
      const g = byId(groupId);
      if (!g) return Promise.resolve();
      if (g.memberIds.includes(personId)) return Promise.resolve(g);
      return patch.mutateAsync({
        id: groupId,
        patch: { memberIds: [...g.memberIds, personId] },
      });
    },

    removeMemberAsync: (groupId: ID, personId: ID) => {
      const g = byId(groupId);
      if (!g) return Promise.resolve();
      return patch.mutateAsync({
        id: groupId,
        patch: { memberIds: g.memberIds.filter((p) => p !== personId) },
      });
    },
  };
}
