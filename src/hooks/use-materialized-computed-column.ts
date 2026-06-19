// use-materialize-computed-column.ts
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
import { computeRollup } from "../lib/compute-rollup";
import { resolveRecordFormulas } from "src/lib/resolve-records-formula";

// Convert a COMPUTED column (rollup/formula) to a scalar, snapshotting the
// currently-displayed values into real stored cells.
export function useMaterializeComputedColumn() {
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

      if (prop.config.type !== "rollup" && prop.config.type !== "formula") {
        throw new Error(
          "useMaterializeComputedColumn handles computed types only",
        );
      }

      const allPages = await fetchPages();
      const rows = allPages.filter(
        (p) => p.sourceId === sourceId && p.values != null,
      );

      // 1. snapshot BEFORE the config changes
      const snapshot: Record<ID, CellValue> = {};
      if (prop.config.type === "rollup") {
        const cfg = prop.config;
        for (const row of rows) {
          snapshot[row.id] = computeRollup({
            record: { values: row.values! },
            properties: source.properties,
            targetSource: source,
            config: cfg,
            pages: allPages,
          }) as CellValue;
        }
      } else {
        const resolved = resolveRecordFormulas(rows, source.properties);
        for (const r of resolved)
          snapshot[r.id] = (r.values?.[propertyId] ?? null) as CellValue;
      }

      // 2. rewrite config to scalar
      await patchDataSource(sourceId, {
        properties: source.properties.map((p) =>
          p.id === propertyId ? { ...p, config: newProp.config } : p,
        ),
      });

      // 3. store the snapshots
      await Promise.all(
        rows.map((row) =>
          patchPage(row.id, {
            values: { ...row.values!, [propertyId]: snapshot[row.id] ?? null },
          }),
        ),
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

      const cachedSource =
        previousSourceDetail ??
        previousSourceList
          .flatMap(([, sources]) => sources ?? [])
          .find((s) => s.id === sourceId);
      const cachedProp = cachedSource?.properties.find(
        (p) => p.id === propertyId,
      );
      const cachedPages = previousPageList.flatMap(([, pages]) => pages ?? []);
      const rows = cachedPages.filter(
        (p) => p.sourceId === sourceId && p.values != null,
      );

      const snapshot: Record<ID, CellValue> = {};
      if (cachedSource && cachedProp) {
        if (cachedProp.config.type === "rollup") {
          const cfg = cachedProp.config;
          for (const row of rows) {
            snapshot[row.id] = computeRollup({
              record: { values: row.values! },
              properties: cachedSource.properties,
              targetSource: cachedSource,
              config: cfg,
              pages: cachedPages,
            }) as CellValue;
          }
        } else if (cachedProp.config.type === "formula") {
          const resolved = resolveRecordFormulas(rows, cachedSource.properties);
          for (const r of resolved)
            snapshot[r.id] = (r.values?.[propertyId] ?? null) as CellValue;
        }
      }

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

      qc.setQueriesData<Page[]>(
        { queryKey: queryKeys.pages.lists() },
        (pages) =>
          (pages ?? []).map((p) => {
            if (p.sourceId !== sourceId || p.values == null) return p;
            return {
              ...p,
              values: { ...p.values, [propertyId]: snapshot[p.id] ?? null },
            };
          }),
      );

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
