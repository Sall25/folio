import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DataSource, DatabaseProperty, ID } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { newId } from "../lib/id";
import { patchDataSource, fetchDataSource } from "../api/data-sources";

// Caller supplies the property WITHOUT an id (we generate it, because for
// relations the mirror must reference it at creation time).
type NewProperty = DatabaseProperty extends infer P
  ? P extends DatabaseProperty
    ? Omit<P, "id">
    : never
  : never;

export function useAddProperty() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceId,
      property,
    }: {
      sourceId: ID;
      property: NewProperty;
    }) => {
      const propId = newId();
      const source = await fetchDataSource(sourceId);

      if (property.config.type === "relation") {
        // Two-source write. Generate BOTH ids up front so each can reference
        // the other.
        const mirrorId = newId();
        const targetSourceId = property.config.targetSourceId;

        // The relation we're adding to THIS source, pointing at its mirror.
        const relationProp: DatabaseProperty = {
          ...property,
          id: propId,
          config: {
            type: "relation",
            showOnTarget: false,
            targetSourceId,
            mirrorPropertyId: mirrorId,
          },
        };

        // The mirror we create on the TARGET source, pointing back at us.
        const mirrorProp: DatabaseProperty = {
          id: mirrorId,
          name: source.name,
          config: {
            type: "relation",
            showOnTarget: true,
            targetSourceId: sourceId,
            mirrorPropertyId: propId,
          },
        };

        // Write both sources. Fetch-modify-patch each (whole-properties PATCH,
        // json-server style).
        await patchDataSource(sourceId, {
          properties: [...source.properties, relationProp],
        });

        const target = await fetchDataSource(targetSourceId);
        await patchDataSource(targetSourceId, {
          properties: [...target.properties, mirrorProp],
        });

        return { sourceId, targetSourceId };
      }

      // Scalar property — single-source write.
      const scalarProp = { ...property, id: propId } as DatabaseProperty;
      await patchDataSource(sourceId, {
        properties: [...source.properties, scalarProp],
      });

      return { sourceId, targetSourceId: null };
    },

    onMutate: async ({
      sourceId,
      property,
    }: {
      sourceId: ID;
      property: NewProperty;
    }) => {
      await qc.cancelQueries({ queryKey: queryKeys.dataSources.all });

      const previousList = qc.getQueriesData<DataSource[]>({
        queryKey: queryKeys.dataSources.lists(),
      });
      const previousDetails = new Map<ID, DataSource | undefined>();

      const cachedSource = previousList
        .flatMap(([, sources]) => sources ?? [])
        .find((s) => s.id === sourceId);
      const mirrorName = cachedSource?.name ?? "";

      const propId = newId();

      // helper to push a property onto a source in BOTH list and detail caches
      const addToSource = (sId: ID, prop: DatabaseProperty) => {
        previousDetails.set(
          sId,
          qc.getQueryData<DataSource>(queryKeys.dataSources.detail(sId)),
        );
        qc.setQueriesData<DataSource[]>(
          { queryKey: queryKeys.dataSources.lists() },
          (sources) =>
            (sources ?? []).map((s) =>
              s.id === sId ? { ...s, properties: [...s.properties, prop] } : s,
            ),
        );
        qc.setQueryData<DataSource>(queryKeys.dataSources.detail(sId), (s) =>
          s ? { ...s, properties: [...s.properties, prop] } : s,
        );
      };

      if (property.config.type === "relation") {
        const mirrorId = newId();
        addToSource(sourceId, {
          ...property,
          id: propId,
          config: {
            type: "relation",
            targetSourceId: property.config.targetSourceId,
            showOnTarget: true,
            mirrorPropertyId: mirrorId,
          },
        });
        addToSource(property.config.targetSourceId, {
          id: mirrorId,
          name: mirrorName,
          config: {
            type: "relation",
            targetSourceId: sourceId,
            mirrorPropertyId: propId,
            showOnTarget: false,
          },
        });
      } else {
        addToSource(sourceId, { ...property, id: propId } as DatabaseProperty);
      }

      return { previousList, previousDetails };
    },

    onError: (_err, _vars, ctx) => {
      ctx?.previousList.forEach(([key, data]) => qc.setQueryData(key, data));
      ctx?.previousDetails.forEach((data, sId) =>
        qc.setQueryData(queryKeys.dataSources.detail(sId), data),
      );
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dataSources.all });
    },
  });
}
