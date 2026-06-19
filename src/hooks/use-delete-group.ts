import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Group, ID, Teamspace } from "../types";
import { deleteGroup } from "../api/groups";
import { queryKeys } from "../lib/queryKeys";

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: ID) => {
      await deleteGroup(id);
    },
    onMutate: async (id: ID) => {
      await qc.cancelQueries({ queryKey: queryKeys.groups.all });
      await qc.cancelQueries({ queryKey: queryKeys.teamspaces.all });

      const previousGroupList = qc.getQueriesData<Group[]>({
        queryKey: queryKeys.groups.lists(),
      });
      const previousTeamspaceList = qc.getQueriesData<Teamspace[]>({
        queryKey: queryKeys.teamspaces.lists(),
      });

      const groupId = id;

      qc.setQueriesData<Teamspace[]>(
        { queryKey: queryKeys.teamspaces.lists() },
        (teamspaces) =>
          (teamspaces ?? []).map((t) =>
            t.groupIds.includes(groupId)
              ? { ...t, groupIds: t.groupIds.filter((gId) => gId !== groupId) }
              : t,
          ),
      );
      qc.setQueriesData<Group[]>(
        { queryKey: queryKeys.groups.lists() },
        (groups) => (groups ?? []).filter((g) => g.id !== groupId),
      );

      return { previousGroupList, previousTeamspaceList };
    },
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: queryKeys.groups.detail(id) });
    },
    onError: (_error, _vars, ctx) => {
      ctx?.previousGroupList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
      ctx?.previousTeamspaceList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.groups.all });
      qc.invalidateQueries({ queryKey: queryKeys.teamspaces.all });
    },
  });
}
