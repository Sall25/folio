import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deletePerson } from "../api/people";
import type { Group, ID, Person, Teamspace } from "../types";
import { queryKeys } from "../lib/queryKeys";

export function useDeletePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: ID) => {
      await deletePerson(id);
    },
    onMutate: async (id: ID) => {
      await qc.cancelQueries({ queryKey: queryKeys.people.all });
      await qc.cancelQueries({ queryKey: queryKeys.groups.all });
      await qc.cancelQueries({ queryKey: queryKeys.teamspaces.all });

      const previousPersonList = qc.getQueriesData<Person[]>({
        queryKey: queryKeys.people.lists(),
      });
      const previousGroupList = qc.getQueriesData<Group[]>({
        queryKey: queryKeys.groups.lists(),
      });
      const previousTeamspaceList = qc.getQueriesData<Teamspace[]>({
        queryKey: queryKeys.teamspaces.lists(),
      });
      const personId = id;

      qc.setQueriesData<Group[]>(
        { queryKey: queryKeys.groups.lists() },
        (groups) =>
          (groups ?? []).map((g) =>
            g.memberIds.includes(personId)
              ? {
                  ...g,
                  memberIds: g.memberIds.filter((mId) => mId !== personId),
                }
              : g,
          ),
      );
      qc.setQueriesData<Teamspace[]>(
        { queryKey: queryKeys.teamspaces.lists() },
        (teamspaces) =>
          (teamspaces ?? []).map((t) =>
            t.ownerIds.includes(personId) || t.memberIds.includes(personId)
              ? {
                  ...t,
                  ownerIds: t.ownerIds.filter((oId) => oId !== personId),
                  memberIds: t.memberIds.filter((mId) => mId !== personId),
                }
              : t,
          ),
      );
      qc.setQueriesData<Person[]>(
        { queryKey: queryKeys.people.lists() },
        (people) => (people ?? []).filter((p) => p.id !== id),
      );

      return { previousPersonList, previousGroupList, previousTeamspaceList };
    },
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: queryKeys.people.detail(id) });
    },
    onError: (_error, _vars, ctx) => {
      ctx?.previousGroupList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
      ctx?.previousPersonList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
      ctx?.previousTeamspaceList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.people.all });
      qc.invalidateQueries({ queryKey: queryKeys.groups.all });
      qc.invalidateQueries({ queryKey: queryKeys.teamspaces.all });
    },
  });
}
