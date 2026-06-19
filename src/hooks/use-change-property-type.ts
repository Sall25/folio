// use-change-property-type.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  DataSource,
  Page,
  ID,
  DatabaseProperty,
  CellValue,
} from "../types";
import { queryKeys } from "../lib/queryKeys";
import { patchDataSource, fetchDataSource } from "../api/data-sources";
import { patchPage, fetchPages } from "../api/pages";
import { convertValue } from "../lib/convert-value";

// Scalar-only. Refuses relation/rollup (those route to materialize or add/remove).
export function useChangePropertyType() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceId,
      propertyId,
      newProp,
    }: {
      sourceId: ID;
      propertyId: ID;
      newProp: DatabaseProperty;
    }) => {
      const source = await fetchDataSource(sourceId);
      const prop = source.properties.find((p) => p.id === propertyId);
      if (!prop) return;

      if (prop.config.type === "relation" || prop.config.type === "rollup") {
        throw new Error("useChangePropertyType handles scalar types only");
      }

      const fromType = prop.config.type;
      const toType = newProp.config.type;
      const fromConfig = prop.config;
      const toConfig = newProp.config;

      // 1. rewrite the property's CONFIG (not a phantom `type` field)
      await patchDataSource(sourceId, {
        properties: source.properties.map((p) =>
          p.id === propertyId ? { ...p, config: newProp.config } : p,
        ),
      });

      // 2. convert every row-page's cell
      const allPages = await fetchPages();
      const rows = allPages.filter(
        (p) => p.sourceId === sourceId && p.values != null,
      );
      await Promise.all(
        rows.map((row) => {
          const oldValue = row.values![propertyId];
          if (oldValue === undefined) return Promise.resolve();
          const converted = convertValue(
            oldValue,
            fromType,
            toType,
            fromConfig,
            toConfig,
          );
          return patchPage(row.id, {
            values: { ...row.values!, [propertyId]: converted as CellValue },
          });
        }),
      );
    },

    onMutate: async ({ sourceId, propertyId, newProp }) => {
      await qc.cancelQueries({ queryKey: queryKeys.dataSources.all });
      await qc.cancelQueries({ queryKey: queryKeys.pages.all });

      const previousSourceList = qc.getQueriesData<DataSource[]>({
        queryKey: queryKeys.dataSources.lists(),
      });
      const previousSourceDetail = qc.getQueryData<DataSource>(
        queryKeys.dataSources.detail(sourceId),
      );
      const previousPageList = qc.getQueriesData<Page[]>({
        queryKey: queryKeys.pages.lists(),
      });

      const cachedProp = previousSourceList
        .flatMap(([, sources]) => sources ?? [])
        .find((s) => s.id === sourceId)
        ?.properties.find((p) => p.id === propertyId);

      const fromType =
        cachedProp &&
        cachedProp.config.type !== "relation" &&
        cachedProp.config.type !== "rollup"
          ? cachedProp.config.type
          : null;
      const toType = newProp.config.type;
      const fromConfig = cachedProp?.config;
      const toConfig = newProp.config;

      const retypeIn = (s: DataSource): DataSource => ({
        ...s,
        properties: s.properties.map((p) =>
          p.id === propertyId ? { ...p, config: newProp.config } : p,
        ),
      });
      qc.setQueriesData<DataSource[]>(
        { queryKey: queryKeys.dataSources.lists() },
        (sources) =>
          (sources ?? []).map((s) => (s.id === sourceId ? retypeIn(s) : s)),
      );
      qc.setQueryData<DataSource>(
        queryKeys.dataSources.detail(sourceId),
        (s) => (s ? retypeIn(s) : s),
      );

      if (fromType && fromConfig) {
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
              const converted = convertValue(
                p.values[propertyId],
                fromType,
                toType,
                fromConfig,
                toConfig,
              );
              return {
                ...p,
                values: { ...p.values, [propertyId]: converted as CellValue },
              };
            }),
        );
      }

      return { previousSourceList, previousSourceDetail, previousPageList };
    },

    onError: (_err, vars, ctx) => {
      ctx?.previousSourceList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
      qc.setQueryData(
        queryKeys.dataSources.detail(vars.sourceId),
        ctx?.previousSourceDetail,
      );
      ctx?.previousPageList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dataSources.all });
      qc.invalidateQueries({ queryKey: queryKeys.pages.all });
    },
  });
}
