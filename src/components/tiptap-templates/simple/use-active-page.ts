import { useCallback, useEffect } from "react";
import { usePages } from "./use-pages";
import type { Page } from "./types";
import { useActivePageId } from "./context/active-page-context";

function findPage(pages: Page[], id: string): Page | undefined {
  for (const page of pages) {
    if (page.id === id) return page;
    if (page.children?.length) {
      const found = findPage(page.children, id);
      if (found) return found;
    }
  }
}

export function useActivePage() {
  const {
    pages,
    isLoading,
    addPageAsync,
    updatePageAsync,
    deletePageAsync,
    query,
    onSearch,
    addCoverAsync,
  } = usePages();
  const { activePageId, setActivePageId } = useActivePageId();

  const activePage =
    (activePageId ? findPage(pages ?? [], activePageId) : null) ??
    pages?.[0] ??
    null;

  useEffect(() => {
    if (!isLoading && pages?.length === 0)
      addPageAsync({ title: "Untitled", parentId: null });
  }, [isLoading, pages, addPageAsync]);

  useEffect(() => {
    if (!activePageId && pages?.length)
      requestAnimationFrame(() => setActivePageId(pages[0].id));
  }, [pages, activePageId, setActivePageId]);

  const addPageAndActivateAsync = useCallback(
    async (data: Parameters<typeof addPageAsync>[0]) => {
      const newPage = await addPageAsync(data);
      if (newPage?.id) setActivePageId(newPage.id);
      return newPage;
    },
    [addPageAsync, setActivePageId],
  );

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

  return {
    pages,
    activePage,
    isLoading,
    setActivePageId,
    updateSettingsAsync,
    updateCoverAsync,
    addPageAsync: addPageAndActivateAsync, // ← replaces the original addPage
    deletePageAsync,
    query,
    onSearch,
    updatePageAsync,
    addCoverAsync,
  };
}
