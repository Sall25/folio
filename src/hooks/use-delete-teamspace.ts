import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteTeamspace } from "../api/teamspaces";
import type { ID, Teamspace } from "../types";
import { queryKeys } from "../lib/queryKeys";

export function useDeleteTeamspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: ID) => {
      await deleteTeamspace(id);
    },
    onMutate: async (id: ID) => {
      await qc.cancelQueries({ queryKey: queryKeys.teamspaces.all });

      const previousTeamspaceList = qc.getQueriesData<Teamspace[]>({
        queryKey: queryKeys.teamspaces.lists(),
      });

      qc.setQueriesData<Teamspace[]>(
        { queryKey: queryKeys.teamspaces.lists() },
        (teamspaces) => (teamspaces ?? []).filter((t) => t.id !== id),
      );

      return { previousTeamspaceList };
    },
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: queryKeys.teamspaces.detail(id) });
    },
    onError: (_error, _vars, ctx) => {
      ctx?.previousTeamspaceList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teamspaces.all });
    },
  });
}
