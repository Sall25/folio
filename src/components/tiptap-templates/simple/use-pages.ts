import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Page, PageCategory } from "./types";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedCallback, type DebouncedState } from "use-debounce";
import { findPage } from "src/lib/find-page";
import type { JSONContent } from "@tiptap/core";
import type { DataSource } from "src/components/tiptap-node/inline-database/types/types";
import { useDataSources } from "src/components/tiptap-node/inline-database/hooks/use-data-sources";

function getDescendantIds(pages: Page[], parentId: number): number[] {
  const children = pages.filter((p) => p.parentId === parentId);
  return children.flatMap((c) => [c.id, ...getDescendantIds(pages, c.id)]);
}

function buildTree(pages: Page[]): Page[] {
  const map = new Map<number, Page>();
  const roots: Page[] = [];

  pages.forEach((p) => map.set(p.id, { ...p, children: [] }));

  map.forEach((page) => {
    if (page.parentId !== null) {
      const parent = map.get(page.parentId);
      if (parent) {
        parent.children.push(page);
      } else {
        roots.push(page);
      }
    } else {
      roots.push(page);
    }
  });

  return roots;
}

const fetchPagesAsync = async () => {
  const res = await fetch("/api/pages");
  if (!res.ok) throw new Error("Failed to fetch pages");

  const data = await res.json();
  return data;
};

const addPageFnAsync = async ({
  title,
  parentId,
  category,
  databaseId,
  recordId,
  content,
}: {
  title: string;
  parentId: number | null;
  category?: PageCategory;
  databaseId?: string;
  recordId?: string;
  content?: JSONContent;
}) => {
  const res = await fetch("/api/pages", {
    method: "POST",
    body: JSON.stringify({
      title,
      parentId,
      category,
      databaseId,
      recordId,
      children: [],
      settings: { width: "medium", text: "normal", locked: false },
      cover: { iconName: null, coverImage: null, target: null },
      content: content ?? {
        type: "doc",
        content: [
          {
            type: "title",
            content: title ? [{ type: "text", text: title }] : [],
          },
          { type: "paragraph" },
        ],
      },
      createdAt: Date.now().toString(),
      updatedAt: null,
    }),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to add page");
  return res.json();
};

// json-server has no cascade delete, so delete the page AND every descendant
// id explicitly (one DELETE each). Descendant ids are computed by the caller
// from the cache before deletion.
const deletePageFnAsync = async (id: number, descendantIds: number[] = []) => {
  const ids = [id, ...descendantIds];
  await Promise.all(
    ids.map((pid) =>
      fetch(`/api/pages/${pid}`, { method: "DELETE" }).then((res) => {
        if (!res.ok) throw new Error(`Failed to delete page ${pid}`);
      }),
    ),
  );
};

const updatePageFnAsync = async (page: Page) => {
  const res = await fetch(`/api/pages/${page.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: page.title,
      settings: page.settings,
      cover: page.cover,
      content: page.content,
      parentId: page.parentId,
      category: page.category,
      updatedAt: Date.now().toString(),
    }),
    headers: { "Content-Type": "application/json" },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok)
    throw new Error(`Failed to update page: ${JSON.stringify(json)}`);
  return json;
};

export interface UsePagesReturn {
  pages: Page[] | undefined;
  isLoading: boolean;
  addPageAsync: (data: {
    title: string;
    parentId: number | null;
    category?: PageCategory;
    databaseId?: string;
    recordId?: string;
    content?: JSONContent;
  }) => Promise<Page>;
  addChildPageAsync: (parentId: number) => Promise<void>;
  addRootPageAsync: () => Promise<void>;
  deletePageAsync: (id: number) => Promise<void>;
  updatePageAsync: (page: Page) => Promise<Page>;
  query: string;
  onSearch: (search: string) => void;
  addCoverAsync: (id: number) => Promise<void>;
  debounceUpdatePage: DebouncedState<(page: Page) => Promise<Page>>;
  debounceUpdatePageFast: DebouncedState<(page: Page) => Promise<Page>>;
  addPageTemplateAsync: (data: {
    title: string;
    parentId: number | null;
  }) => Promise<Page>;
  patchPageLocal: (page: Page) => void;
}

export function usePages(): UsePagesReturn {
  const client = useQueryClient();
  const [query, setQuery] = useState("");
  const selectPages = useCallback((data: Page[]) => buildTree(data), []);
  const onSearch = useCallback((search: string) => setQuery(search), []);

  // Source deletion is owned by useDataSources. We consume it here so that
  // deleting a database PAGE also deletes its data source (database-is-a-page
  // model). The ["dataSources"] query is shared/deduped by React Query, so
  // this adds a subscriber, not a duplicate fetch.
  const { deleteSourceAsync } = useDataSources();

  const { data: pages, isLoading } = useQuery({
    queryKey: ["pages"],
    queryFn: () => fetchPagesAsync(),
    placeholderData: keepPreviousData,
    select: selectPages,
  });

  const { mutateAsync: _addPageAsync } = useMutation({
    mutationKey: ["addPage"],
    mutationFn: addPageFnAsync,
    onSuccess: (created) => {
      client.setQueryData<Page[]>(["pages"], (old = []) => [...old, created]);
      client.invalidateQueries({ queryKey: ["pages"] });
    },
  });

  const { mutateAsync: _deletePageAsync } = useMutation({
    mutationFn: ({
      id,
      descendantIds,
    }: {
      id: number;
      descendantIds: number[];
    }) => deletePageFnAsync(id, descendantIds),
    onMutate: async ({ id }: { id: number; descendantIds: number[] }) => {
      await client.cancelQueries({ queryKey: ["pages"] });
      const previous = client.getQueryData<Page[]>(["pages"]);
      client.setQueryData<Page[]>(["pages"], (old = []) => {
        const idsToRemove = new Set([id, ...getDescendantIds(old, id)]);
        return old.filter((p) => !idsToRemove.has(p.id));
      });
      return { previous };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) client.setQueryData(["pages"], ctx.previous);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["pages"] }),
  });

  const { mutateAsync: _updatePageAsync } = useMutation({
    mutationKey: ["updatePage"],
    mutationFn: updatePageFnAsync,
    onMutate: async (page: Page) => {
      await client.cancelQueries({ queryKey: ["pages"] });
      const previous = client.getQueryData<Page[]>(["pages"]);

      client.setQueryData<Page[]>(["pages"], (old = []) =>
        old.map((p) => {
          if (p.id !== page.id) return p;
          // Drop stale writes: if the cache already has a newer updatedAt than the
          // incoming payload, this write is from an older snapshot — ignore it so a
          // late/cross-page debounce flush can't clobber fresher content.
          const incoming = Number(page.updatedAt ?? 0);
          const current = Number(p.updatedAt ?? 0);
          if (incoming < current) return p;
          return { ...p, ...page };
        }),
      );
      return { previous };
    },
    onError: (_err, _page, context) => {
      if (context?.previous) {
        client.setQueryData(["pages"], context.previous);
      }
    },
    onSuccess: (updatedPage) => {
      client.setQueryData<Page[]>(["pages"], (old = []) =>
        old.map((p) => (p.id === updatedPage.id ? updatedPage : p)),
      );
    },
  });

  // Synchronous local cache write (no network). Kept for callers that want an
  // instant ["pages"] update. Do NOT call this on every keystroke — it
  // serializes/writes the whole page and triggers a re-render.
  const patchPageLocal = useCallback(
    (page: Page) => {
      client.setQueryData<Page[]>(["pages"], (old = []) =>
        old.map((p) => (p.id === page.id ? { ...p, ...page } : p)),
      );
    },
    [client],
  );

  // Stable refs — mutateAsync changes identity across renders, refs don't.
  const addPageAsyncRef = useRef(_addPageAsync);
  const deletePageAsyncRef = useRef(_deletePageAsync);
  const updatePageAsyncRef = useRef(_updatePageAsync);

  useEffect(() => {
    addPageAsyncRef.current = _addPageAsync;
  }, [_addPageAsync]);
  useEffect(() => {
    deletePageAsyncRef.current = _deletePageAsync;
  }, [_deletePageAsync]);
  useEffect(() => {
    updatePageAsyncRef.current = _updatePageAsync;
  }, [_updatePageAsync]);

  // ── Stable function identities ────────────────────────────────────────────

  const addPageAsync = useCallback(
    (data: {
      title: string;
      parentId: number | null;
      category?: PageCategory;
      databaseId?: string;
      recordId?: string;
      content?: JSONContent;
    }) => addPageAsyncRef.current(data),
    [],
  );

  const updatePageAsync = useCallback(
    (page: Page) => updatePageAsyncRef.current(page),
    [],
  );

  // Delete a page + all descendant pages (server cascade), then delete any
  // data sources owned by those pages. "The database is a page": a source's
  // pageId is the id of the database page that owns it, so deleting that page
  // must also remove its source. Linked database NODES on OTHER pages are
  // untouched — they reference the source but don't own it (their owning page
  // isn't in the deleted set).
  const deletePageAsync = useCallback(
    async (id: number) => {
      // Read the FLAT cache (getQueryData returns raw data; `select` only
      // transforms what the hook consumer sees). getDescendantIds walks
      // parentId on the flat list.
      const flat = client.getQueryData<Page[]>(["pages"]) ?? [];
      const descendantIds = getDescendantIds(flat, id);
      const allIds = [id, ...descendantIds];

      // Which deleted pages own a data source? Match page.id → source.pageId.
      const sources = client.getQueryData<DataSource[]>(["dataSources"]) ?? [];
      const sourceIdsToDelete = sources
        .filter((s) => s.pageId != null && allIds.includes(s.pageId))
        .map((s) => s.id);

      // 1. Delete the pages (descendants cascade on the server).
      await deletePageAsyncRef.current({ id, descendantIds });

      // 2. Delete the sources those pages owned. deleteSourceAsync handles its
      //    own cache (optimistic removal + evicting ["dataSource", id]).
      await Promise.all(sourceIdsToDelete.map((sid) => deleteSourceAsync(sid)));
    },
    [client, deleteSourceAsync],
  );

  // Debounces — updatePageAsync is stable, so these are stable too.
  const debounceUpdatePage = useDebouncedCallback(
    (page: Page) => updatePageAsync(page),
    6000,
    { maxWait: 10000 },
  );

  const debounceUpdatePageFast = useDebouncedCallback(
    (page: Page) => updatePageAsync(page),
    1000,
    { maxWait: 2000 },
  );

  const pagesRef = useRef(pages);
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  const addChildPageAsync = useCallback(
    async (parentId: number) => {
      await addPageAsync({ title: "New Page", parentId });
    },
    [addPageAsync],
  );

  const addRootPageAsync = useCallback(
    async () => addPageAsync({ title: "New Page", parentId: null }),
    [addPageAsync],
  );

  const addPageTemplateAsync = useCallback(
    (data: { title: string; parentId: number | null }) =>
      addPageAsync({ ...data, category: "Template" }),
    [addPageAsync],
  );

  const addCoverAsync = useCallback(
    async (id: number) => {
      const page = pagesRef.current ? findPage(pagesRef.current, id) : null;
      if (!page) return;
      await updatePageAsync({
        ...page,
        cover: { ...page.cover, coverImage: "/covers/default-cover.jpg" },
      });
    },
    [updatePageAsync],
  );

  return {
    pages,
    isLoading,
    addPageAsync,
    addChildPageAsync,
    addRootPageAsync,
    deletePageAsync,
    updatePageAsync,
    debounceUpdatePage,
    debounceUpdatePageFast,
    query,
    onSearch,
    addCoverAsync,
    addPageTemplateAsync,
    patchPageLocal,
  };
}
