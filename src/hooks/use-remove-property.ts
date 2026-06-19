/* eslint-disable @typescript-eslint/no-unused-vars */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DataSource, Page, ID } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { patchDataSource, fetchDataSource } from "../api/data-sources";
import { patchPage, fetchPages } from "../api/pages";

export function useRemoveProperty() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceId,
      propertyId,
    }: {
      sourceId: ID;
      propertyId: ID;
    }) => {
      const source = await fetchDataSource(sourceId);
      const prop = source.properties.find((p) => p.id === propertyId);
      if (!prop) return;

      // 1. Remove the property from this source.
      await patchDataSource(sourceId, {
        properties: source.properties.filter((p) => p.id !== propertyId),
      });

      // 2. If it's a relation, remove its mirror from the target source.
      if (prop.config.type === "relation" && prop.config.mirrorPropertyId) {
        const target = await fetchDataSource(prop.config.targetSourceId);
        const mirrorPropertyId = prop.config.mirrorPropertyId;
        await patchDataSource(prop.config.targetSourceId, {
          properties: target.properties.filter(
            (p) => p.id !== mirrorPropertyId,
          ),
        });
      }

      // 3. Strip the cell value for this property from every row-page of the source.
      const allPages = await fetchPages();
      const rows = allPages.filter(
        (p) => p.sourceId === sourceId && p.values != null,
      );
      await Promise.all(
        rows
          .filter((row) => row.values![propertyId] !== undefined)
          .map((row) => {
            const { [propertyId]: _drop, ...rest } = row.values!;
            return patchPage(row.id, { values: rest });
          }),
      );

      // (4. Rollups referencing this property are now broken — onSettled's
      //  invalidate will surface that; a fuller model would sweep them here.)
    },

    onMutate: async ({
      sourceId,
      propertyId,
    }: {
      sourceId: ID;
      propertyId: ID;
    }) => {
      await qc.cancelQueries({ queryKey: queryKeys.dataSources.all });
      await qc.cancelQueries({ queryKey: queryKeys.pages.all });

      const previousSourceList = qc.getQueriesData<DataSource[]>({
        queryKey: queryKeys.dataSources.lists(),
      });
      const previousPageList = qc.getQueriesData<Page[]>({
        queryKey: queryKeys.pages.lists(),
      });
      const previousDetails = new Map<ID, DataSource | undefined>();

      // find the property (and its mirror target) from the cache
      const cachedSource = previousSourceList
        .flatMap(([, sources]) => sources ?? [])
        .find((s) => s.id === sourceId);
      const prop = cachedSource?.properties.find((p) => p.id === propertyId);

      const removeFromSource = (sId: ID, removePropId: ID) => {
        previousDetails.set(
          sId,
          qc.getQueryData<DataSource>(queryKeys.dataSources.detail(sId)),
        );
        qc.setQueriesData<DataSource[]>(
          { queryKey: queryKeys.dataSources.lists() },
          (sources) =>
            (sources ?? []).map((s) =>
              s.id === sId
                ? {
                    ...s,
                    properties: s.properties.filter(
                      (p) => p.id !== removePropId,
                    ),
                  }
                : s,
            ),
        );
        qc.setQueryData<DataSource>(queryKeys.dataSources.detail(sId), (s) =>
          s
            ? {
                ...s,
                properties: s.properties.filter((p) => p.id !== removePropId),
              }
            : s,
        );
      };

      // 1. remove the property here
      removeFromSource(sourceId, propertyId);

      // 2. remove the mirror, if relation
      if (prop?.config?.type === "relation" && prop.config.mirrorPropertyId) {
        removeFromSource(
          prop.config.targetSourceId,
          prop.config.mirrorPropertyId,
        );
      }

      // 3. strip the cell value from every row-page
      qc.setQueriesData<Page[]>(
        { queryKey: queryKeys.pages.lists() },
        (pages) =>
          (pages ?? []).map((p) => {
            if (
              p.sourceId !== sourceId ||
              p.values == null ||
              p.values[propertyId] === undefined
            )
              return p;
            const { [propertyId]: _drop, ...rest } = p.values;
            return { ...p, values: rest };
          }),
      );

      return { previousSourceList, previousPageList, previousDetails };
    },

    onError: (_err, _vars, ctx) => {
      ctx?.previousSourceList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
      ctx?.previousPageList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
      ctx?.previousDetails.forEach((data, sId) =>
        qc.setQueryData(queryKeys.dataSources.detail(sId), data),
      );
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dataSources.all });
      qc.invalidateQueries({ queryKey: queryKeys.pages.all });
    },
  });
}
