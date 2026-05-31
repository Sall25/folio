import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import type {
  DataSource,
  DataSourceRecord,
  DatabaseProperty,
  ID,
} from "../types/types";

// ── API ────────────────────────────────────────────────────────────────────
const api = "http://localhost:3005";
const fetchSourcesAsync = async (): Promise<DataSource[]> => {
  const res = await fetch(`${api}/data-sources`);
  if (!res.ok) throw new Error("Failed to fetch data sources");
  return res.json();
};

const createSourceFnAsync = async (args: {
  id?: ID;
  name?: string;
  pageId?: number;
  properties: DatabaseProperty[];
  records?: DataSourceRecord[];
}): Promise<DataSource> => {
  const res = await fetch(`${api}/data-sources`, {
    method: "POST",
    body: JSON.stringify({
      id: args.id,
      name: args.name ?? "Untitled",
      pageId: args.pageId,
      properties: args.properties,
      records: args.records ?? [],
      createdAt: Date.now().toString(),
      updatedAt: null,
    }),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to create data source");
  return res.json();
};

const deleteSourceFnAsync = async (id: ID): Promise<void> => {
  const res = await fetch(`${api}/data-sources/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete data source");
};

// ── Hook ─────────────────────────────────────────────────────────────────

export interface UseDataSourcesReturn {
  sources: DataSource[] | undefined;
  isLoading: boolean;
  getSource: (id: ID) => DataSource | undefined;
  createSourceAsync: (args: {
    id?: ID;
    name?: string;
    pageId?: number;
    properties: DatabaseProperty[];
    records?: DataSourceRecord[];
  }) => Promise<DataSource>;
  deleteSourceAsync: (id: ID) => Promise<void>;
}

export function useDataSources(): UseDataSourcesReturn {
  const client = useQueryClient();

  const { data: sources, isLoading } = useQuery({
    queryKey: ["dataSources"],
    queryFn: fetchSourcesAsync,
    placeholderData: keepPreviousData,
  });

  const { mutateAsync: _createSource } = useMutation({
    mutationKey: ["createSource"],
    mutationFn: createSourceFnAsync,
    onSuccess: (created) => {
      // seed the singular-source cache so useDataSource(id) is warm immediately
      client.setQueryData(["dataSource", created.id], created);
      client.invalidateQueries({ queryKey: ["dataSources"] });
    },
  });

  const { mutateAsync: _deleteSource } = useMutation({
    mutationKey: ["deleteSource"],
    mutationFn: deleteSourceFnAsync,
    onMutate: async (id: ID) => {
      await client.cancelQueries({ queryKey: ["dataSources"] });
      const previous = client.getQueryData<DataSource[]>(["dataSources"]);
      client.setQueryData<DataSource[]>(["dataSources"], (old = []) =>
        old.filter((s) => s.id !== id),
      );
      return { previous };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.previous) client.setQueryData(["dataSources"], ctx.previous);
    },
    onSuccess: (_data, id) => {
      client.removeQueries({ queryKey: ["dataSource", id] });
      client.invalidateQueries({ queryKey: ["dataSources"] });
    },
  });

  // Stable identities — your usePages pattern
  const createRef = useRef(_createSource);
  const deleteRef = useRef(_deleteSource);
  useEffect(() => void (createRef.current = _createSource), [_createSource]);
  useEffect(() => void (deleteRef.current = _deleteSource), [_deleteSource]);

  const getSource = useCallback(
    (id: ID) => sources?.find((s) => s.id === id),
    [sources],
  );

  const createSourceAsync = useCallback(
    (args: {
      id?: ID;
      properties: DatabaseProperty[];
      records?: DataSourceRecord[];
    }) => createRef.current(args),
    [],
  );

  const deleteSourceAsync = useCallback((id: ID) => deleteRef.current(id), []);

  return {
    sources,
    isLoading,
    getSource,
    createSourceAsync,
    deleteSourceAsync,
  };
}
