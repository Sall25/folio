import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ID, Version } from "../types";
import { queryKeys } from "../lib/queryKeys";

export type VersionPatch = Partial<Omit<Version, "id">>;

export function usePatchVersion(
  mutationFn: (args: { id: ID; patch: VersionPatch }) => Promise<Version>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async ({ id, patch }: { id: ID; patch: VersionPatch }) => {
      await qc.cancelQueries({ queryKey: queryKeys.versions.all });

      const previousVersions = qc.getQueriesData<Version[]>({
        queryKey: queryKeys.versions.lists(),
      });
      const previousVersionDetail = qc.getQueryData(
        queryKeys.versions.detail(id),
      );

      qc.setQueriesData<Version[]>(
        { queryKey: queryKeys.versions.lists() },
        (old) => old?.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      );
      qc.setQueryData<Version>(queryKeys.versions.detail(id), (v) =>
        v?.id === id ? { ...v, ...patch } : v,
      );

      return { previousVersions, previousVersionDetail };
    },
    onError: (_error, vars, ctx) => {
      ctx?.previousVersions.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
      if (ctx?.previousVersionDetail)
        qc.setQueryData(
          queryKeys.versions.detail(vars.id),
          ctx.previousVersionDetail,
        );
    },
  });
}
