import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useDebounce,
  useDebouncedCallback,
  type DebouncedState,
} from "use-debounce";
import type {
  Book,
  Paper,
  ResourceLink,
  Citation,
  ResourceType,
  ResourceStats,
} from "../types";

// ─── Union type ───────────────────────────────────────────────────────────────

export type Resource =
  | (Book & { type: "book" })
  | (Paper & { type: "paper" })
  | (ResourceLink & { type: "link" })
  | (Citation & { type: "citation" });

export type ResourceInput = Omit<Resource, "id" | "createdAt" | "updatedAt">;

// ─── API ──────────────────────────────────────────────────────────────────────

const fetchResourcesAsync = async (): Promise<Resource[]> => {
  const res = await fetch("http://localhost:3004/resources");
  if (!res.ok) throw new Error("Failed to fetch resources");
  return res.json();
};

const addResourceFnAsync = async (input: ResourceInput): Promise<Resource> => {
  const res = await fetch("http://localhost:3004/resources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    }),
  });
  if (!res.ok) throw new Error("Failed to add resource");
  return res.json();
};

const updateResourceFnAsync = async (resource: Resource): Promise<Resource> => {
  const res = await fetch(`http://localhost:3004/resources/${resource.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...resource,
      updatedAt: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error("Failed to update resource");
  return res.json();
};

const deleteResourceFnAsync = async (id: string): Promise<void> => {
  const res = await fetch(`http://localhost:3004/resources/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete resource");
};

// ─── Selectors ────────────────────────────────────────────────────────────────

function computeStats(resources: Resource[]): ResourceStats {
  return {
    books: resources.filter((r) => r.type === "book").length,
    papers: resources.filter((r) => r.type === "paper").length,
    links: resources.filter((r) => r.type === "link").length,
    citations: resources.filter((r) => r.type === "citation").length,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseResourcesReturn {
  resources: Resource[] | undefined;
  books: Book[];
  papers: Paper[];
  links: ResourceLink[];
  citations: Citation[];
  stats: ResourceStats;
  isLoading: boolean;
  query: string;
  onSearch: (q: string) => void;
  activeType: ResourceType;
  setActiveType: (type: ResourceType) => void;
  addResourceAsync: (input: ResourceInput) => Promise<Resource>;
  updateResourceAsync: (resource: Resource) => Promise<Resource>;
  deleteResourceAsync: (id: string) => Promise<void>;
  debounceUpdateResource: DebouncedState<
    (resource: Resource) => Promise<Resource>
  >;
}

export function useResources(): UseResourcesReturn {
  const client = useQueryClient();
  const [query, setQuery] = useState("");
  const [debounceQuery] = useDebounce(query, 300);
  const [activeType, setActiveType] = useState<ResourceType>("books");
  const onSearch = useCallback((q: string) => setQuery(q), []);

  const { data: resources, isLoading } = useQuery({
    queryKey: ["resources", debounceQuery],
    queryFn: fetchResourcesAsync,
    placeholderData: keepPreviousData,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const { mutateAsync: _addResourceAsync } = useMutation({
    mutationKey: ["addResource"],
    mutationFn: addResourceFnAsync,
    onSuccess: () => client.invalidateQueries({ queryKey: ["resources"] }),
  });

  const { mutateAsync: _updateResourceAsync } = useMutation({
    mutationKey: ["updateResource"],
    mutationFn: updateResourceFnAsync,
    onMutate: async (resource: Resource) => {
      await client.cancelQueries({ queryKey: ["resources"] });
      const previous = client.getQueryData<Resource[]>(["resources"]);
      client.setQueryData<Resource[]>(["resources"], (old = []) =>
        old.map((r) => (r.id === resource.id ? { ...r, ...resource } : r)),
      );
      return { previous };
    },
    onError: (_err, _resource, context) => {
      if (context?.previous) {
        client.setQueryData(["resources"], context.previous);
      }
    },
    onSuccess: (updated) => {
      client.setQueryData<Resource[]>(["resources"], (old = []) =>
        old.map((r) => (r.id === updated.id ? updated : r)),
      );
    },
  });

  const { mutateAsync: _deleteResourceAsync } = useMutation({
    mutationKey: ["deleteResource"],
    mutationFn: deleteResourceFnAsync,
    onMutate: (id: string) => {
      client.setQueryData<Resource[]>(["resources"], (old = []) =>
        old.filter((r) => r.id !== id),
      );
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["resources"] }),
    onError: () => client.invalidateQueries({ queryKey: ["resources"] }),
  });

  // ── Stable refs ────────────────────────────────────────────────────────────

  const addResourceAsyncRef = useRef(_addResourceAsync);
  const updateResourceAsyncRef = useRef(_updateResourceAsync);
  const deleteResourceAsyncRef = useRef(_deleteResourceAsync);

  useEffect(() => {
    addResourceAsyncRef.current = _addResourceAsync;
  }, [_addResourceAsync]);
  useEffect(() => {
    updateResourceAsyncRef.current = _updateResourceAsync;
  }, [_updateResourceAsync]);
  useEffect(() => {
    deleteResourceAsyncRef.current = _deleteResourceAsync;
  }, [_deleteResourceAsync]);

  // ── Stable callbacks ───────────────────────────────────────────────────────

  const addResourceAsync = useCallback(
    (input: ResourceInput) => addResourceAsyncRef.current(input),
    [],
  );

  const updateResourceAsync = useCallback(
    (resource: Resource) => updateResourceAsyncRef.current(resource),
    [],
  );

  const deleteResourceAsync = useCallback(
    (id: string) => deleteResourceAsyncRef.current(id),
    [],
  );

  const debounceUpdateResource = useDebouncedCallback(
    (resource: Resource) => updateResourceAsync(resource),
    1000,
    { maxWait: 2000 },
  );

  // ── Derived slices ─────────────────────────────────────────────────────────

  const all = resources ?? [];
  const books = all.filter(
    (r): r is Book & { type: "book" } => r.type === "book",
  );
  const papers = all.filter(
    (r): r is Paper & { type: "paper" } => r.type === "paper",
  );
  const links = all.filter(
    (r): r is ResourceLink & { type: "link" } => r.type === "link",
  );
  const citations = all.filter(
    (r): r is Citation & { type: "citation" } => r.type === "citation",
  );
  const stats = computeStats(all);

  return {
    resources,
    books,
    papers,
    links,
    citations,
    stats,
    isLoading,
    query,
    onSearch,
    activeType,
    setActiveType,
    addResourceAsync,
    updateResourceAsync,
    deleteResourceAsync,
    debounceUpdateResource,
  };
}
