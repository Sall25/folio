import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DataSource, ID } from "../types";
import { queryKeys } from "../lib/queryKeys";

export type DataSourcePatch = Partial<Omit<DataSource, "id" | "properties">>;

export function usePatchDataSource(
  mutationFn: (args: { id: ID; patch: DataSourcePatch }) => Promise<DataSource>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async ({ id, patch }: { id: ID; patch: DataSourcePatch }) => {
      await qc.cancelQueries({ queryKey: queryKeys.dataSources.all });

      const previousDataSourceList = qc.getQueriesData<DataSource[]>({
        queryKey: queryKeys.dataSources.lists(),
      });
      const previousDataSourceDetail = qc.getQueryData<DataSource>(
        queryKeys.dataSources.detail(id),
      );

      qc.setQueriesData<DataSource[]>(
        { queryKey: queryKeys.dataSources.lists() },
        (dataSources) =>
          (dataSources ?? []).map((ds) =>
            ds.id === id ? { ...ds, ...patch } : ds,
          ),
      );
      qc.setQueryData<DataSource>(queryKeys.dataSources.detail(id), (ds) =>
        ds?.id === id ? { ...ds, ...patch } : ds,
      );

      return { previousDataSourceDetail, previousDataSourceList };
    },
    onError: (_error, vars, ctx) => {
      ctx?.previousDataSourceList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
      if (ctx?.previousDataSourceDetail)
        qc.setQueryData(
          queryKeys.dataSources.detail(vars.id),
          ctx.previousDataSourceDetail,
        );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dataSources.all });
    },
  });
}
