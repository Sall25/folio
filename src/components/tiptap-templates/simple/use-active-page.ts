import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePages, type UsePagesReturn } from "./use-pages";
import type { Page } from "./types";
import type { ID } from "src/components/tiptap-node/inline-database/types/types";
import { useLocation, useNavigate } from "@tanstack/react-location";

function findPage(pages: Page[], id: number): Page | undefined {
  for (const page of pages) {
    if (page.id === id) return page;
    if (page.children?.length) {
      const found = findPage(page.children, id);
      if (found) return found;
    }
  }
}

function flattenPages(pages: Page[]): Page[] {
  return pages.flatMap((p) => [p, ...flattenPages(p.children ?? [])]);
}

export type UseActivePageReturn = {
  pages: Page[] | undefined;
  activePage: Page | null;
  templates: Page[];
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
  updateDatabaseLinkAsync: (
    id: number,
    databaseId: ID,
    recordId: ID,
  ) => Promise<void>;
  addCoverAsync: (id: number) => Promise<void>;
  debounceUpdatePage: UsePagesReturn["debounceUpdatePage"];
  debounceUpdatePageFast: UsePagesReturn["debounceUpdatePageFast"];
  activePageId: number | undefined;
  setActivePageId: (pageId: number | undefined) => void;
  addPageTemplateAsync: (data: {
    title: string;
    parentId: number | null;
  }) => Promise<Page>;
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
    addPageTemplateAsync,
  } = usePages();

  const navigate = useNavigate();
  const location = useLocation();

  const activePageId = useMemo(() => {
    const match = location.current.pathname.match(/\/page\/(\d+)/);
    return match ? Number(match[1]) : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.current.pathname]);

  const activePage = useMemo(
    () =>
      activePageId === undefined || !pages
        ? null
        : (findPage(pages, activePageId) ?? null),
    [pages, activePageId],
  );

  const templates = useMemo(
    () =>
      pages ? flattenPages(pages).filter((p) => p.category === "Template") : [],
    [pages],
  );

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

  const updateDatabaseLinkAsync = useCallback(
    async (id: number, databaseId: ID, recordId: ID) => {
      const page = findPage(pagesRef.current ?? [], id);
      if (!page) return;
      await updatePageAsync({ ...page, databaseId, recordId });
    },
    [updatePageAsync],
  );

  const deletePageAsync = useCallback(
    async (id: number) => {
      await providedDeletePageAsync(id);

      if (activePageIdRef.current === id) {
        const flatPages = flattenPages(pagesRef.current ?? []);
        const nextPage = flatPages.find((p) => p.id !== id);
        if (nextPage) setActivePageId(nextPage.id);
      }
    },
    [providedDeletePageAsync, setActivePageId],
  );

  useEffect(() => {
    return () => {
      debounceUpdatePage.flush();
      debounceUpdatePageFast.flush();
    };
  }, [activePageId, debounceUpdatePage, debounceUpdatePageFast]);

  return {
    pages,
    activePage,
    templates,
    activePageId,
    isLoading,
    setActivePageId,
    updateSettingsAsync,
    updateCoverAsync,
    addPageAndActivateAsync,
    deletePageAsync,
    query,
    onSearch,
    updatePageAsync,
    updateDatabaseLinkAsync,
    addCoverAsync,
    debounceUpdatePage,
    debounceUpdatePageFast,
    addPageTemplateAsync,
  };
}
