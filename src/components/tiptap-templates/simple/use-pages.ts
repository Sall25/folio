import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Page } from "./types";
import { useState } from "react";
import { useDebounce } from "use-debounce";

function buildTree(pages: Page[]): Page[] {
  const map = new Map<string, Page>();
  const roots: Page[] = [];

  pages.forEach((p) => map.set(p.id, { ...p, children: [] }));

  map.forEach((page) => {
    if (page.parentId) {
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
  parentId: string | null;
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

const deletePageFnAsync = async (id: string) => {
  const res = await fetch(`/api/pages/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete page");
};

const searchPageAsync = async (query: string) => {
  const res = await fetch(`/api/pages?name_like=${query}`);
  if (!res.ok) throw new Error("Couldn't find page");

  return res.json();
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
  const data = res.json();
  if (!res.ok) throw new Error("Failed to update page");

  return data;
};

export function usePages() {
  const client = useQueryClient();
  const [query, setQuery] = useState("");
  const [debounceQuery] = useDebounce(query, 300);

  const onSearch = (search: string) => setQuery(search);

  const { data: pages, isLoading } = useQuery({
    queryKey: ["pages", debounceQuery],
    queryFn: () =>
      debounceQuery.length > 0
        ? searchPageAsync(debounceQuery)
        : fetchPagesAsync(),
    placeholderData: keepPreviousData,
    select: (data) => buildTree(data),
  });

  const { mutateAsync: addPageAsync } = useMutation({
    mutationFn: addPageFnAsync,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["pages"] });
    },
  });

  const { mutateAsync: deletePageAsync } = useMutation({
    mutationFn: deletePageFnAsync,
    onMutate: (id) => {
      client.setQueryData<Page[]>(["pages", debounceQuery], (old = []) =>
        old.filter((p) => p.id !== id),
      );
    },
    onError: () => {
      client.invalidateQueries({ queryKey: ["pages"] });
    },
  });

  const { mutateAsync: updatePageAsync } = useMutation({
    mutationFn: updatePageFnAsync,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["pages"] });
    },
  });

  // Adds a child page under a given parent
  const addChildPageAsync = async (parentId: string) => {
    await addPageAsync({ title: "New Page", parentId });
  };

  // Adds a root-level page
  const addRootPageAsync = async () => {
    addPageAsync({ title: "New Page", parentId: null });
  };

  const addCoverAsync = async (id: string) => {
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
    query,
    onSearch,
    addCoverAsync,
  };
}
