import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePages, type UsePagesReturn } from "./use-pages";
import type { Page } from "./types";
import { useMatch, useNavigate } from "@tanstack/react-location";

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
  activePageId: number | undefined;
  setActivePageId: (pageId: number | undefined) => void;
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

  const { params } = useMatch();
  const navigate = useNavigate();

  // Single source of truth: derive directly from URL, no state/effect needed
  const activePageId = useMemo(
    () => (params.pageId ? Number(params.pageId) : undefined),
    [params.pageId],
  );

  //  Derive activePage directly too — no useState, no effect, no extra render
  const activePage = useMemo(
    () =>
      activePageId === undefined || !pages
        ? null
        : (findPage(pages, activePageId) ?? null),
    [pages, activePageId],
  );
  // Refs kept in sync for use inside stable callbacks
  const activePageIdRef = useRef(activePageId);
  const activePageRef = useRef(activePage);
  const pagesRef = useRef(pages);

  useEffect(() => {
    activePageIdRef.current = activePageId;
  }, [activePageId]);

  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  const setActivePageId = useCallback(
    (id: number | undefined) => {
      // Navigation IS the state update — URL is the source of truth
      if (id === undefined) navigate({ to: "/" });
      else navigate({ to: `/page/${id}` });
    },
    [navigate],
  );

  const addPageAndActivateAsync = useCallback(
    async (data: Parameters<typeof addPageAsync>[0]) => {
      const newPage = await addPageAsync(data);
      if (newPage?.id) setActivePageId(newPage.id);
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
      if (!activePageRef.current) return;
      await updatePageAsync({
        ...activePageRef.current,
        settings: { ...activePageRef.current.settings, ...patch },
      });
    },
    [updatePageAsync],
  );

  const updateCoverAsync = useCallback(
    async (cover: Page["cover"]) => {
      if (!activePageRef.current) return;
      await updatePageAsync({ ...activePageRef.current, cover });
    },
    [updatePageAsync],
  );

  const deletePageAsync = useCallback(
    async (id: number) => {
      await providedDeletePageAsync(id);

      if (activePageIdRef.current === id) {
        const flatPages =
          pagesRef.current?.flatMap(function flatten(p): Page[] {
            return [p, ...(p.children ?? []).flatMap(flatten)];
          }) ?? [];

        const nextPage = flatPages.find((p) => p.id !== id);
        if (nextPage) setActivePageId(nextPage.id);
      }
    },
    [providedDeletePageAsync, setActivePageId],
  );

  useEffect(() => {
    return () => {
      // Runs when activePageId changes — flushes before new page loads
      debounceUpdatePage.flush();
      debounceUpdatePageFast.flush();
    };
  }, [activePageId, debounceUpdatePage, debounceUpdatePageFast]);

  return {
    pages,
    activePage, // From state — reactive
    activePageId, // From state — reactive
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
