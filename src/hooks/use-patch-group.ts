import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Group, ID } from "../types";
import { queryKeys } from "../lib/queryKeys";

export type GroupPatch = Partial<Omit<Group, "id">>;

export function usePatchGroup(
  mutationFn: (args: { id: ID; patch: GroupPatch }) => Promise<Group>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async ({ id, patch }: { id: ID; patch: GroupPatch }) => {
      await qc.cancelQueries({ queryKey: queryKeys.groups.all });

      const previousGroups = qc.getQueriesData<Group[]>({
        queryKey: queryKeys.groups.lists(),
      });
      const previousGroupDetail = qc.getQueryData<Group>(
        queryKeys.groups.detail(id),
      );

      qc.setQueriesData<Group[]>(
        { queryKey: queryKeys.groups.lists() },
        (old) => old?.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      );
      qc.setQueryData<Group>(queryKeys.groups.detail(id), (g) =>
        g?.id === id ? { ...g, ...patch } : g,
      );

      return { previousGroups, previousGroupDetail };
    },
    onError: (_error, vars, ctx) => {
      ctx?.previousGroups.forEach(([key, data]) => qc.setQueryData(key, data));
      if (ctx?.previousGroupDetail)
        qc.setQueryData(
          queryKeys.groups.detail(vars.id),
          ctx.previousGroupDetail,
        );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
}
