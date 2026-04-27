import { useCallback, useEffect, useMemo } from "react";
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
  debounceUpdatePageFast: UsePagesReturn["debounceUpdatePageFast"];
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
    debounceUpdatePageFast,
  } = usePages();
  const { activePageId, setActivePageId } = useActivePageId();
  const activePage = useMemo(() => {
    if (activePageId === undefined || !pages) return null;
    return findPage(pages, activePageId) ?? null;
  }, [pages, activePageId]);

  const addPageAndActivateAsync = useCallback(
    async (data: Parameters<typeof addPageAsync>[0]) => {
      const newPage = await addPageAsync(data);
      if (newPage?.id) {
        setActivePageId(newPage.id);
      }
      return newPage;
    },
    [addPageAsync, setActivePageId],
  );

  useEffect(() => {
    if (!isLoading && pages?.length === 0) {
      addPageAsync({ title: "Untitled", parentId: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    [updatePageAsync, activePage],
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
    activePage: activePage,
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
    debounceUpdatePageFast,
  };
}
