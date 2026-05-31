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
  ID,
} from "../types/types";

// ── API ────────────────────────────────────────────────────────────────────
const api = "http://localhost:3005";

const fetchSourceAsync = async (id: ID): Promise<DataSource> => {
  const res = await fetch(`${api}/data-sources/${id}`);
  if (!res.ok) throw new Error("Failed to fetch data source");
  return res.json();
};

// One PATCH for everything — json-server supports PATCH /data-sources/:id.
// We send the whole records/properties payload (whole-source write).
const patchSourceFnAsync = async (source: DataSource): Promise<DataSource> => {
  const res = await fetch(`${api}/data-sources/${source.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: source.name,
      pageId: source.pageId,
      properties: source.properties,
      records: source.records,
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

  return {
    source,
    isLoading,
    getCellValue,
    setCellValue,
    addRecordAsync,
    addRecordWithPageAsync,
    removeRecordAsync,
    updatePropertiesAsync,
    updateSourceMetaAsync,
  };
}
