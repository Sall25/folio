import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ID, Teamspace } from "../types";
import { queryKeys } from "../lib/queryKeys";

export type TeamspacePatch = Partial<Omit<Teamspace, "id">>;

export function usePatchTeamspace(
  mutationFn: (args: { id: ID; patch: TeamspacePatch }) => Promise<Teamspace>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async ({ id, patch }: { id: ID; patch: TeamspacePatch }) => {
      await qc.cancelQueries({ queryKey: queryKeys.teamspaces.all });

      const previousTeamspaces = qc.getQueriesData<Teamspace[]>({
        queryKey: queryKeys.teamspaces.lists(),
      });
      const previousTeamspaceDetail = qc.getQueryData<Teamspace>(
        queryKeys.teamspaces.detail(id),
      );

      qc.setQueriesData<Teamspace[]>(
        { queryKey: queryKeys.teamspaces.lists() },
        (old) => old?.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      );
      qc.setQueryData<Teamspace>(queryKeys.teamspaces.detail(id), (t) =>
        t?.id === id ? { ...t, ...patch } : t,
      );

      return { previousTeamspaces, previousTeamspaceDetail };
    },
    onError: (_error, vars, ctx) => {
      ctx?.previousTeamspaces.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
      if (ctx?.previousTeamspaceDetail)
        qc.setQueryData(
          queryKeys.teamspaces.detail(vars.id),
          ctx.previousTeamspaceDetail,
        );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teamspaces.all });
    },
  });
}
