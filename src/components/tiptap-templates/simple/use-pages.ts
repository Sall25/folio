import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Page, PageCategory } from "./types";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useDebounce,
  useDebouncedCallback,
  type DebouncedState,
} from "use-debounce";
import { findPage } from "src/lib/find-page";
import type { JSONContent } from "@tiptap/core";

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

  return res.json();
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

const deletePageFnAsync = async (id: number) => {
  const res = await fetch(`/api/pages/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete page");
};

const updatePageFnAsync = async (page: Page) => {
  const res = await fetch(`/api/pages/${page.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: page.title,
      settings: page.settings,
      cover: page.cover,
      content: page.content,
      updatedAt: Date.now().toString(),
    }),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to update page: ${errorBody}`);
  }

  return res.json();
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
}

export function usePages(): UsePagesReturn {
  const client = useQueryClient();
  const [query, setQuery] = useState("");
  const [debounceQuery] = useDebounce(query, 300);
  const selectPages = useCallback((data: Page[]) => buildTree(data), []);
  const onSearch = useCallback((search: string) => setQuery(search), []);

  const { data: pages, isLoading } = useQuery({
    queryKey: ["pages"],
    queryFn: () => fetchPagesAsync(),
    placeholderData: keepPreviousData,
    select: selectPages,
  });

  const { mutateAsync: _addPageAsync } = useMutation({
    mutationKey: ["addPage"],
    mutationFn: addPageFnAsync,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["pages"] });
    },
  });

  const { mutateAsync: _deletePageAsync } = useMutation({
    mutationKey: ["deletePage"],
    mutationFn: deletePageFnAsync,
    onMutate: (id: number) => {
      client.setQueryData<Page[]>(["pages", debounceQuery], (old = []) => {
        const idsToRemove = new Set([id, ...getDescendantIds(old, id)]);
        return old.filter((p) => !idsToRemove.has(p.id));
      });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["pages"] }),
    onError: () => client.invalidateQueries({ queryKey: ["pages"] }),
  });

  const { mutateAsync: _updatePageAsync } = useMutation({
    mutationKey: ["updatePage"],
    mutationFn: updatePageFnAsync,
    onMutate: async (page: Page) => {
      await client.cancelQueries({ queryKey: ["pages"] });
      const previous = client.getQueryData<Page[]>(["pages"]);
      client.setQueryData<Page[]>(["pages"], (old = []) =>
        old.map((p) => (p.id === page.id ? { ...p, ...page } : p)),
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

  // Stable refs — mutateAsync changes every render, refs don't
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

  //Stable function identities — never change after mount

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

  const deletePageAsync = useCallback(
    (id: number) => deletePageAsyncRef.current(id),
    [],
  );

  const updatePageAsync = useCallback(
    (page: Page) => updatePageAsyncRef.current(page),
    [],
  );

  // Debounces are now stable — updatePageAsync never changes
  const debounceUpdatePage = useDebouncedCallback(
    (page: Page) => updatePageAsync(page),
    30000,
    { maxWait: 50000 },
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
  };
}
