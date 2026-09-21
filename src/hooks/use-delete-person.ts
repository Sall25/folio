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

      // Match on the `.all` prefix rather than lists(workspaceId) — lists()
      // now requires a workspaceId this hook has no single value for, and a
      // prefix matches every workspace's cached list. Updaters guard against
      // non-array matches since `.all` also catches detail entries.
      const previousPersonList = qc.getQueriesData<Person[]>({
        queryKey: queryKeys.people.all,
      });
      const previousGroupList = qc.getQueriesData<Group[]>({
        queryKey: queryKeys.groups.all,
      });
      const previousTeamspaceList = qc.getQueriesData<Teamspace[]>({
        queryKey: queryKeys.teamspaces.all,
      });
      const personId = id;

      qc.setQueriesData<Group[]>(
        { queryKey: queryKeys.groups.all },
        (groups) =>
          Array.isArray(groups)
            ? groups.map((g) =>
                g.memberIds.includes(personId)
                  ? {
                      ...g,
                      memberIds: g.memberIds.filter((mId) => mId !== personId),
                    }
                  : g,
              )
            : groups,
      );
      qc.setQueriesData<Teamspace[]>(
        { queryKey: queryKeys.teamspaces.all },
        (teamspaces) =>
          Array.isArray(teamspaces)
            ? teamspaces.map((t) =>
                t.ownerIds.includes(personId) || t.memberIds.includes(personId)
                  ? {
                      ...t,
                      ownerIds: t.ownerIds.filter((oId) => oId !== personId),
                      memberIds: t.memberIds.filter((mId) => mId !== personId),
                    }
                  : t,
              )
            : teamspaces,
      );
      qc.setQueriesData<Person[]>(
        { queryKey: queryKeys.people.all },
        (people) =>
          Array.isArray(people) ? people.filter((p) => p.id !== id) : people,
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
