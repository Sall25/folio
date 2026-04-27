import { useCallback, useEffect, useMemo, useState } from "react";
import { usePages, type UsePagesReturn } from "./use-pages";
import type { Page } from "./types";
import { useActivePageId } from "./context/active-page-context";

function findPage(pages: Page[], id: number): Page | undefined {
  for (const page of pages) {
    if (page.id === id) return page;
    if (page.children?.length) {
      const found = findPage(page.children, id);
      if (found) return found;
    }
  }
}

export type UseActivePageReturn = {
  pages: Page[] | undefined;
  activePage: Page | null;
  isLoading: boolean;
  setActivePageId: (id: number) => void;
  updateSettingsAsync: (patch: Partial<Page["settings"]>) => Promise<void>;
  updateCoverAsync: (cover: Page["cover"]) => Promise<void>;
  addPageAndActivateAsync: (data: {
    title: string;
    parentId: number | null;
  }) => Promise<Page>;
  deletePageAsync: (id: number) => Promise<void>;
  query: string;
  onSearch: (search: string) => void;
  updatePageAsync: (page: Page) => Promise<Page>;
  addCoverAsync: (id: number) => Promise<void>;
  debounceUpdatePage: UsePagesReturn["debounceUpdatePage"];
};

export function useActivePage(): UseActivePageReturn {
  const {
    pages,
    isLoading,
    addPageAsync,
    updatePageAsync,
    deletePageAsync: providedDeletePageAsync,
    query,
    onSearch,
    addCoverAsync,
    debounceUpdatePage,
  } = usePages();
  const { activePageId, setActivePageId } = useActivePageId();
  const [pendingPage, setPendingPage] = useState<Page | null>(null);

  const activePage = useMemo(() => {
    if (!pages?.length) return null;
    const found =
      activePageId !== undefined ? findPage(pages, activePageId) : null;
    return found ?? pendingPage ?? pages[0];
  }, [activePageId, pendingPage, pages]);

  const addPageAndActivateAsync = useCallback(
    async (data: Parameters<typeof addPageAsync>[0]) => {
      const newPage = await addPageAsync(data);
      if (newPage?.id) {
        setPendingPage(newPage);
        setActivePageId(newPage.id);
      }
      return newPage;
    },
    [addPageAsync, setActivePageId],
  );

  useEffect(() => {
    if (!isLoading && pages?.length === 0)
      addPageAsync({ title: "Untitled", parentId: null });
  }, [isLoading, pages, addPageAsync]);

  const updateSettingsAsync = useCallback(
    async (patch: Partial<Page["settings"]>) => {
      if (!activePage) return;
      await updatePageAsync({
        ...activePage,
        settings: { ...activePage.settings, ...patch },
      });
    },
    [activePage, updatePageAsync],
  );

  const updateCoverAsync = useCallback(
    async (cover: Page["cover"]) => {
      if (!activePage) return;
      await updatePageAsync({ ...activePage, cover });
    },
    [activePage, updatePageAsync],
  );

  const deletePageAsync = useCallback(
    async (id: number) => {
      await providedDeletePageAsync(id);

      // If the deleted page was active, switch to another page
      if (activePageId === id) {
        const flatPages =
          pages?.flatMap(function flatten(p): Page[] {
            return [p, ...(p.children ?? []).flatMap(flatten)];
          }) ?? [];

        const nextPage = flatPages.find((p) => p.id !== id);
        if (nextPage) {
          setActivePageId(nextPage.id);
        }
      }
    },
    [activePageId, pages, providedDeletePageAsync, setActivePageId],
  );

  return {
    pages,
    activePage,
    isLoading,
    setActivePageId,
    updateSettingsAsync,
    updateCoverAsync,
    addPageAndActivateAsync,
    deletePageAsync,
    query,
    onSearch,
    updatePageAsync,
    debounceUpdatePage,
    addCoverAsync,
  };
}
