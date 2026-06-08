import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import type { Page } from "src/components/tiptap-templates/simple/types";
import type {
  DataSource,
  DataSourceRecord,
  DatabaseProperty,
  DatabaseView,
  SavedView,
  ID,
  PropertyType,
} from "../types/types";
import { makeDefaultView } from "../utils";
import { resolveRecordFormulas } from "../components/formula-editor/resolve-records-formula";
import { planTypeChange } from "../utils/property-type-change";
import { computeRollup } from "../utils/compute-rollup";

// ── API ────────────────────────────────────────────────────────────────────
const api = "http://localhost:3005";

const fetchSourceAsync = async (id: ID): Promise<DataSource> => {
  const res = await fetch(`${api}/data-sources/${id}`);
  if (!res.ok) throw new Error("Failed to fetch data source");
  return res.json();
};

// One PATCH for everything — json-server supports PATCH /data-sources/:id.
// We send the whole records/properties/views payload (whole-source write).
const patchSourceFnAsync = async (source: DataSource): Promise<DataSource> => {
  const res = await fetch(`${api}/data-sources/${source.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: source.name,
      pageId: source.pageId,
      properties: source.properties,
      records: source.records,
      views: source.views ?? [],
      savedViews: source.savedViews ?? [],
      updatedAt: Date.now().toString(),
    }),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to update source");
  return res.json();
};

// ── Hook ─────────────────────────────────────────────────────────────────

export interface UseDataSourceReturn {
  source: DataSource | undefined;
  isLoading: boolean;
  getCellValue: (recordId: ID, propertyId: ID) => unknown;
  setCellValue: (recordId: ID, propertyId: ID, value: unknown) => void;
  addRecordAsync: (recordId?: ID) => Promise<DataSourceRecord>;
  addRecordWithPageAsync: (opts: {
    title?: string;
    parentPageId?: number | null;
    createPage: (data: {
      title: string;
      parentId: number | null;
      databaseId?: string;
      recordId?: string;
    }) => Promise<Page>;
  }) => Promise<DataSourceRecord>;
  removeRecordAsync: (recordId: ID) => Promise<void>;
  updatePropertiesAsync: (
    properties: DatabaseProperty[],
  ) => Promise<DataSource | undefined>;
  updateSourceMetaAsync: (patch: {
    name?: string;
    pageId?: number;
  }) => Promise<unknown>;

  /** Change a property's type, migrating every record's value in one PATCH. */
  changePropertyTypeAsync: (
    propId: ID,
    newType: PropertyType,
  ) => Promise<DataSource | undefined>;

  // ── Source-owned views (shared across every node on this source) ────────
  addViewAsync: (
    type: DatabaseView["type"],
    name: string,
  ) => Promise<DatabaseView | undefined>;
  updateViewAsync: (
    viewId: ID,
    patch: Partial<Omit<DatabaseView, "id">>,
  ) => Promise<DataSource | undefined>;
  deleteViewAsync: (viewId: ID) => Promise<DatabaseView[]>;
  duplicateViewAsync: (viewId: ID) => Promise<DatabaseView | undefined>;

  // ── Saved-view catalog (bookkeeping for "start from") ───────────────────
  registerViewsAsync: (entries: SavedView[]) => Promise<void>;

  resolvedRecords: DataSourceRecord[];
}

export function useDataSource(
  sourceId: ID | null | undefined,
): UseDataSourceReturn {
  const client = useQueryClient();
  const key = ["dataSource", sourceId] as const;

  const { data: source, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => fetchSourceAsync(sourceId as ID),
    enabled: !!sourceId,
    placeholderData: keepPreviousData,
    retry: 1, // don't hammer on a genuine 404
  });

  const { mutateAsync: _patchSource } = useMutation({
    mutationKey: ["patchSource", sourceId],
    mutationFn: patchSourceFnAsync,
  });

  const patchRef = useRef(_patchSource);
  useEffect(() => void (patchRef.current = _patchSource), [_patchSource]);

  // Read current source from cache, apply transform, write cache (optimistic),
  // return the new source so the caller can persist it.
  const mutateSource = useCallback(
    (transform: (s: DataSource) => DataSource): DataSource | undefined => {
      if (!sourceId) return undefined;
      const current = client.getQueryData<DataSource>(["dataSource", sourceId]);
      if (!current) return undefined;
      const next = transform(current);
      client.setQueryData(["dataSource", sourceId], next);
      return next;
    },
    [sourceId, client],
  );

  // Cell values: optimistic now, debounced PATCH (whole source)
  const debouncedPatch = useDebouncedCallback(
    (next: DataSource) => patchRef.current(next),
    600,
    { maxWait: 2000 },
  );

  const getCellValue = useCallback(
    (recordId: ID, propertyId: ID): unknown => {
      const rec = source?.records.find((r) => r.id === recordId);
      return rec ? (rec.values[propertyId] ?? null) : null;
    },
    [source],
  );

  const setCellValue = useCallback(
    (recordId: ID, propertyId: ID, value: unknown) => {
      const next = mutateSource((s) => ({
        ...s,
        records: s.records.map((r) =>
          r.id !== recordId
            ? r
            : { ...r, values: { ...r.values, [propertyId]: value } },
        ),
      }));
      if (next) debouncedPatch(next);
    },
    [mutateSource, debouncedPatch],
  );

  const addRecordAsync = useCallback(
    async (recordId?: ID): Promise<DataSourceRecord> => {
      const record: DataSourceRecord = {
        id: recordId ?? crypto.randomUUID(),
        values: {},
        createdAt: Date.now().toString(),
        updatedAt: null,
      };
      const next = mutateSource((s) => ({
        ...s,
        records: [...s.records, record],
      }));
      if (next) await patchRef.current(next);
      return record;
    },
    [mutateSource],
  );

  const addRecordWithPageAsync = useCallback(
    async (opts: {
      title?: string;
      parentPageId?: number | null;
      createPage: (data: {
        title: string;
        parentId: number | null;
        databaseId?: string;
        recordId?: string;
      }) => Promise<Page>;
    }): Promise<DataSourceRecord> => {
      if (!sourceId) throw new Error("No sourceId");
      const recordId = crypto.randomUUID();

      // 1. linked page (child of the database's page, per the dedicated-page model)
      const page = await opts.createPage({
        title: opts.title ?? "",
        parentId: opts.parentPageId ?? null,
        databaseId: sourceId,
        recordId,
      });

      // 2. record stamped with the page id
      const record: DataSourceRecord = {
        id: recordId,
        values: {},
        pageId: page.id,
        createdAt: Date.now().toString(),
        updatedAt: null,
      };
      const next = mutateSource((s) => ({
        ...s,
        records: [...s.records, record],
      }));
      if (next) await patchRef.current(next);
      return record;
    },
    [sourceId, mutateSource],
  );

  const removeRecordAsync = useCallback(
    async (recordId: ID) => {
      const next = mutateSource((s) => ({
        ...s,
        records: s.records.filter((r) => r.id !== recordId),
      }));
      if (next) await patchRef.current(next);
    },
    [mutateSource],
  );

  const updatePropertiesAsync = useCallback(
    async (properties: DatabaseProperty[]) => {
      const next = mutateSource((s) => ({ ...s, properties }));
      if (next) return patchRef.current(next);
      return undefined;
    },
    [mutateSource],
  );

  const updateSourceMetaAsync = useCallback(
    async (patch: { name?: string; pageId?: number }) => {
      const next = mutateSource((s) => ({ ...s, ...patch }));
      if (next) return patchRef.current(next);
      return undefined;
    },
    [mutateSource],
  );

  // Change a property's type AND migrate every record's value in a single
  // whole-source PATCH, so the new config never momentarily sees old-shaped
  // values. When converting away from a COMPUTED type (rollup/formula) — whose
  // displayed value isn't stored — we snapshot the computed values first (from
  // the cache) so the new column inherits them. planTypeChange is pure.
  const changePropertyTypeAsync = useCallback(
    async (propId: ID, newType: PropertyType) => {
      const current = client.getQueryData<DataSource>(["dataSource", sourceId]);

      let resolved: Record<string, unknown> | undefined;
      if (current) {
        const prop = current.properties.find((p) => p.id === propId);
        const cfg = prop?.config;
        if (cfg?.type === "rollup") {
          // Resolve the rollup's related database from cache, then compute each
          // row's value just like the rollup cell does.
          const relProp = current.properties.find(
            (p) => p.id === cfg.relationPropertyId,
          );
          const relCfg = relProp?.config;
          const targetId =
            relCfg?.type === "relation" ? relCfg.targetDatabaseId : null;
          const target = targetId
            ? client.getQueryData<DataSource>(["dataSource", targetId])
            : undefined;
          resolved = {};
          for (const r of current.records) {
            resolved[r.id] = computeRollup({
              record: r,
              properties: current.properties,
              targetSource: target,
              config: cfg,
            });
          }
        } else if (cfg?.type === "formula") {
          const resolvedRecs = resolveRecordFormulas(
            current.records,
            current.properties,
          );
          resolved = {};
          for (const r of resolvedRecs) resolved[r.id] = r.values[propId];
        }
      }

      const next = mutateSource((s) => {
        const { properties, records } = planTypeChange(
          s,
          propId,
          newType,
          resolved,
        );
        return { ...s, properties, records };
      });
      if (next) return patchRef.current(next);
      return undefined;
    },
    [sourceId, client, mutateSource],
  );

  // ── Views: the shared catalog. Every node on this source reads/writes
  //    here; a node only keeps which view is active (attrs.activeViewId).

  const addViewAsync = useCallback(
    async (
      type: DatabaseView["type"],
      name: string,
    ): Promise<DatabaseView | undefined> => {
      const view = makeDefaultView(type, name);
      const next = mutateSource((s) => ({
        ...s,
        views: [...(s.views ?? []), view],
      }));
      if (next) await patchRef.current(next);
      return next ? view : undefined;
    },
    [mutateSource],
  );

  const updateViewAsync = useCallback(
    async (viewId: ID, patch: Partial<Omit<DatabaseView, "id">>) => {
      const next = mutateSource((s) => ({
        ...s,
        views: (s.views ?? []).map((v) =>
          v.id === viewId ? ({ ...v, ...patch } as DatabaseView) : v,
        ),
      }));
      if (next) return patchRef.current(next);
      return undefined;
    },
    [mutateSource],
  );

  const deleteViewAsync = useCallback(
    async (viewId: ID): Promise<DatabaseView[]> => {
      let remaining: DatabaseView[] = [];
      const next = mutateSource((s) => {
        remaining = (s.views ?? []).filter((v) => v.id !== viewId);
        return { ...s, views: remaining };
      });
      if (next) await patchRef.current(next);
      return remaining;
    },
    [mutateSource],
  );

  const duplicateViewAsync = useCallback(
    async (viewId: ID): Promise<DatabaseView | undefined> => {
      const src = source?.views?.find((v) => v.id === viewId);
      if (!src) return undefined;
      // Clone every field — filters, sorts, grouping, layout — keeping only a
      // fresh identity. Spreading the union member preserves its type fields.
      const copy = {
        ...src,
        id: crypto.randomUUID(),
        name: `${src.name} copy`,
      } as DatabaseView;
      const next = mutateSource((s) => ({
        ...s,
        views: [...(s.views ?? []), copy],
      }));
      if (next) await patchRef.current(next);
      return next ? copy : undefined;
    },
    [source, mutateSource],
  );

  // ── Saved-view catalog: snapshot full views into source.savedViews so any
  //    node can open one with its filters/sorts intact. Keyed by view id;
  //    only writes when a view actually changed (deep compare, no storms).
  const registerViewsAsync = useCallback(
    async (entries: SavedView[]) => {
      if (!sourceId || entries.length === 0) return;
      const current = client.getQueryData<DataSource>(["dataSource", sourceId]);
      if (!current) return;

      const existing = current.savedViews ?? [];
      const byId = new Map(existing.map((e) => [e.id, e]));
      let changed = false;
      for (const e of entries) {
        const prev = byId.get(e.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(e)) {
          byId.set(e.id, e);
          changed = true;
        }
      }
      if (!changed) return;

      const next: DataSource = { ...current, savedViews: [...byId.values()] };
      client.setQueryData(["dataSource", sourceId], next);
      await patchRef.current(next);
    },
    [sourceId, client],
  );

  const resolvedCache = new WeakMap<object, DataSourceRecord[]>();

  function getResolvedRecords(source: DataSource): DataSourceRecord[] {
    // key on the records array identity — stable across callers until data changes
    const cached = resolvedCache.get(source.records);
    if (cached) return cached;
    const resolved = resolveRecordFormulas(source.records, source.properties);
    resolvedCache.set(source.records, resolved);
    return resolved;
  }
  const resolvedRecords = source ? getResolvedRecords(source) : [];

  return {
    source,
    resolvedRecords,
    isLoading,
    getCellValue,
    setCellValue,
    addRecordAsync,
    addRecordWithPageAsync,
    removeRecordAsync,
    updatePropertiesAsync,
    updateSourceMetaAsync,
    changePropertyTypeAsync,
    addViewAsync,
    updateViewAsync,
    deleteViewAsync,
    duplicateViewAsync,
    registerViewsAsync,
  };
}
