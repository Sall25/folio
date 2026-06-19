import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DataSource, ID } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { patchDataSource, fetchDataSource } from "../api/data-sources";

export function useRenameProperty() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceId,
      propertyId,
      name,
    }: {
      sourceId: ID;
      propertyId: ID;
      name: string;
    }) => {
      const source = await fetchDataSource(sourceId);
      await patchDataSource(sourceId, {
        properties: source.properties.map((p) =>
          p.id === propertyId ? { ...p, name } : p,
        ),
      });
    },
    onMutate: async ({
      sourceId,
      propertyId,
      name,
    }: {
      sourceId: ID;
      propertyId: ID;
      name: string;
    }) => {
      await qc.cancelQueries({ queryKey: queryKeys.dataSources.all });

      const previousList = qc.getQueriesData<DataSource[]>({
        queryKey: queryKeys.dataSources.lists(),
      });
      const previousDetail = qc.getQueryData<DataSource>(
        queryKeys.dataSources.detail(sourceId),
      );

      const renameIn = (s: DataSource): DataSource => ({
        ...s,
        properties: s.properties.map((p) =>
          p.id === propertyId ? { ...p, name } : p,
        ),
      });

      qc.setQueriesData<DataSource[]>(
        { queryKey: queryKeys.dataSources.lists() },
        (sources) =>
          (sources ?? []).map((s) => (s.id === sourceId ? renameIn(s) : s)),
      );
      qc.setQueryData<DataSource>(
        queryKeys.dataSources.detail(sourceId),
        (s) => (s ? renameIn(s) : s),
      );

      return { previousList, previousDetail };
    },
    onError: (_err, vars, ctx) => {
      ctx?.previousList.forEach(([key, data]) => qc.setQueryData(key, data));
      qc.setQueryData(
        queryKeys.dataSources.detail(vars.sourceId),
        ctx?.previousDetail,
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dataSources.all });
    },
  });
}
