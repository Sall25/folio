import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTeamspace } from "../api/teamspaces";
import type { Teamspace } from "../types";
import { queryKeys } from "../lib/queryKeys";

export function useCreateTeamspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (teamspace: Teamspace) => {
      return createTeamspace(teamspace);
    },
    onMutate: async (teamspace: Teamspace) => {
      await qc.cancelQueries({ queryKey: queryKeys.teamspaces.all });

      const previousTeamspaceList = qc.getQueriesData<Teamspace[]>({
        queryKey: queryKeys.teamspaces.lists(),
      });

      qc.setQueriesData<Teamspace[]>(
        { queryKey: queryKeys.teamspaces.lists() },
        (teamspaces) => (teamspaces ? [...teamspaces, teamspace] : teamspaces),
      );

      return { previousTeamspaceList };
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
