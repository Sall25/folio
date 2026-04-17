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

const fetchPages = () => fetch("/api/pages").then((res) => res.json());

const addPageFn = ({
  title,
  parentId,
}: {
  title: string;
  parentId: string | null;
}) =>
  fetch("/api/pages", {
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
  }).then((res) => res.json());

const deletePageFn = (id: string) =>
  fetch(`/api/pages/${id}`, { method: "DELETE" }).then((res) => res.json());

const searchPage = (query: string) =>
  fetch(`/api/pages?name_like=${query}`).then((res) => res.json());

const updatePageFn = (page: Page) =>
  fetch(`/api/pages/${page.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: page.title,
      settings: page.settings,
      cover: page.cover,
      content: page.content,
      updatedAt: Date.now().toString(),
    }),
    headers: { "Content-Type": "application/json" },
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to update page");
    return res.json();
  });

export function usePages() {
  const client = useQueryClient();
  const [query, setQuery] = useState("");
  const [debounceQuery] = useDebounce(query, 300);

  const onSearch = (search: string) => setQuery(search);

  const { data: pages, isLoading } = useQuery({
    queryKey: ["pages", debounceQuery],
    queryFn: () =>
      debounceQuery.length > 0 ? searchPage(debounceQuery) : fetchPages(),
    placeholderData: keepPreviousData,
    select: (data) => buildTree(data),
  });

  const { mutateAsync: addPage } = useMutation({
    mutationFn: addPageFn,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["pages"] });
    },
  });

  const { mutate: deletePage } = useMutation({
    mutationFn: deletePageFn,
    onMutate: (id) => {
      // optimistically remove from cache immediately
      client.setQueryData<Page[]>(["pages", debounceQuery], (old = []) =>
        old.filter((p) => p.id !== id),
      );
    },
    onError: (_, id) => {
      // roll back on failure
      client.invalidateQueries({ queryKey: ["pages"] });
    },
  });

  const { mutate: updatePage } = useMutation({
    mutationFn: updatePageFn,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["pages"] });
    },
  });

  // Adds a child page under a given parent
  const addChildPage = (parentId: string) => {
    addPage({ title: "Untitled", parentId });
  };

  // Adds a root-level page
  const addRootPage = () => {
    addPage({ title: "Untitled", parentId: null });
  };

  return {
    pages,
    isLoading,
    addPage,
    addChildPage,
    addRootPage,
    deletePage,
    updatePage,
    query,
    onSearch,
  };
}
