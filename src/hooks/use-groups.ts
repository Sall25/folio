import { useQuery } from "@tanstack/react-query";
import type { Group, Person, ID } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { fetchGroups, fetchGroup } from "../api/groups";
import { usePeopleBase } from "./use-people";

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
// Membership ids live on the group; the entities live in the people cache.
// Two queries, joined in the hook body. Order: preserve memberIds order.
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
