import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Page } from "./types";
import { useState } from "react";
import {
  useDebounce,
  useDebouncedCallback,
  type DebouncedState,
} from "use-debounce";

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
}: {
  title: string;
  parentId: number | null;
}) => {
  const res = await fetch("/api/pages", {
    method: "POST",
    body: JSON.stringify({
      title,
      parentId,
      children: [],
      settings: {
        width: "medium",
        text: "normal",
        locked: false,
      },
      cover: {
        iconName: null,
        coverImage: null,
        target: null,
      },
      content: {
        type: "doc",
        content: [
          {
            type: "title",
            content: title ? [{ type: "text", text: title }] : [],
          },
          {
            type: "paragraph",
          },
        ],
      },
      // content: { type: "doc", content: [{ type: "paragraph" }] },
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
}

export function usePages(): UsePagesReturn {
  const client = useQueryClient();
  const [query, setQuery] = useState("");
  const [debounceQuery] = useDebounce(query, 300);

  const onSearch = (search: string) => setQuery(search);

  const { data: pages, isLoading } = useQuery({
    queryKey: ["pages"],
    queryFn: () => fetchPagesAsync(),
    placeholderData: keepPreviousData,
    select: (data) => {
      const tree = buildTree(data);
      return tree;
    },
  });

  const { mutateAsync: addPageAsync } = useMutation({
    mutationKey: ["addPage"],
    mutationFn: addPageFnAsync,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["pages"] });
    },
  });

  const { mutateAsync: deletePageAsync } = useMutation({
    mutationKey: ["deletePage"],
    mutationFn: deletePageFnAsync,
    onMutate: (id: number) => {
      client.setQueryData<Page[]>(["pages", debounceQuery], (old = []) => {
        const idsToRemove = new Set([id, ...getDescendantIds(old, id)]);
        return old.filter((p) => !idsToRemove.has(p.id));
      });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["pages"] });
    },
    onError: () => {
      client.invalidateQueries({ queryKey: ["pages"] });
    },
  });

  const { mutateAsync: updatePageAsync } = useMutation({
    mutationKey: ["updatePage"],
    mutationFn: updatePageFnAsync,
    onMutate: async (page: Page) => {
      // Cancel any outgoing refetches
      await client.cancelQueries({ queryKey: ["pages"] });

      // Snapshot previous value
      const previous = client.getQueryData<Page[]>(["pages"]);

      // Optimistically update the cache
      client.setQueryData<Page[]>(["pages"], (old = []) =>
        old.map((p) => (p.id === page.id ? { ...p, ...page } : p)),
      );

      return { previous };
    },
    onError: (_err, _page, context) => {
      // Rollback on error
      if (context?.previous) {
        client.setQueryData(["pages"], context.previous);
      }
    },
    onSuccess: (updatedPage) => {
      // Update cache with server response instead of invalidating
      client.setQueryData<Page[]>(["pages"], (old = []) =>
        old.map((p) => (p.id === updatedPage.id ? updatedPage : p)),
      );
      // Remove this — it's what triggers the refetch loop
      // client.invalidateQueries({ queryKey: ["pages"] });
    },
  });

  const debounceUpdatePage = useDebouncedCallback(
    async (page: Page) => await updatePageAsync(page),
    30000,
    { maxWait: 50000 }, // ← also add maxWait so it can't loop forever
  );

  //  Fast debounce for title changes — syncs sidebar quickly
  const debounceUpdatePageFast = useDebouncedCallback(
    async (page: Page) => await updatePageAsync(page),
    1000,
    { maxWait: 2000 },
  );

  // Adds a child page under a given parent
  const addChildPageAsync = async (parentId: number) => {
    await addPageAsync({ title: "New Page", parentId });
  };

  // Adds a root-level page
  const addRootPageAsync = async () => {
    addPageAsync({ title: "New Page", parentId: null });
  };

  const addCoverAsync = async (id: number) => {
    const page = pages?.flat().find((p) => p.id === id); // or however you look up a page
    if (!page) return;

    await updatePageAsync({
      ...page,
      cover: {
        ...page.cover,
        coverImage: "/covers/default-cover.jpg", // your default cover
      },
    });
  };

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
  };
}
