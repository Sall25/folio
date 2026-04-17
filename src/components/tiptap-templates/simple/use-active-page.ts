// import { useCallback, useState, useEffect } from "react";
// import { usePages } from "./use-pages";
// import type { Page } from "./types";

// function findPage(pages: Page[], id: string): Page | undefined {
//   for (const page of pages) {
//     if (page.id === id) return page;
//     if (page.children?.length) {
//       const found = findPage(page.children, id);
//       if (found) return found;
//     }
//   }
// }

// export function useActivePage() {
//   const { pages, isLoading, addPage, updatePage, deletePage, query, onSearch } =
//     usePages();
//   const [activePageId, setActivePageId] = useState<string | null>(null);

//   const activePage =
//     (activePageId ? findPage(pages ?? [], activePageId) : null) ??
//     pages?.[0] ??
//     null;

//   useEffect(() => {
//     if (!isLoading && pages?.length === 0)
//       addPage({ title: "Untitled", parentId: null });
//   }, [isLoading, pages, addPage]);

//   useEffect(() => {
//     if (!activePageId && pages?.length)
//       requestAnimationFrame(() => setActivePageId(pages[0].id));
//   }, [pages, activePageId]);

//   const updateSettings = useCallback(
//     (patch: Partial<Page["settings"]>) => {
//       if (!activePage) return;
//       updatePage({
//         ...activePage,
//         settings: { ...activePage.settings, ...patch },
//       });
//     },
//     [activePage, updatePage],
//   );

//   const updateCover = useCallback(
//     (cover: Page["cover"]) => {
//       if (!activePage) return;
//       updatePage({ ...activePage, cover });
//     },
//     [activePage, updatePage],
//   );

//   return {
//     pages,
//     activePage,
//     isLoading,
//     setActivePageId,
//     updateSettings,
//     updateCover,
//     addPage,
//     deletePage,
//     query,
//     onSearch,
//     updatePage,
//   };
// }

import { useCallback, useState, useEffect } from "react";
import { usePages } from "./use-pages";
import type { Page } from "./types";

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
  const { pages, isLoading, addPage, updatePage, deletePage, query, onSearch } =
    usePages();
  const [activePageId, setActivePageId] = useState<string | null>(null);

  const activePage =
    (activePageId ? findPage(pages ?? [], activePageId) : null) ??
    pages?.[0] ??
    null;

  useEffect(() => {
    if (!isLoading && pages?.length === 0)
      addPage({ title: "Untitled", parentId: null });
  }, [isLoading, pages, addPage]);

  useEffect(() => {
    if (!activePageId && pages?.length)
      requestAnimationFrame(() => setActivePageId(pages[0].id));
  }, [pages, activePageId]);

  const addPageAndActivate = useCallback(
    async (data: Parameters<typeof addPage>[0]) => {
      const newPage = await addPage(data);
      if (newPage?.id) setActivePageId(newPage.id);
      return newPage;
    },
    [addPage],
  );

  const updateSettings = useCallback(
    (patch: Partial<Page["settings"]>) => {
      if (!activePage) return;
      updatePage({
        ...activePage,
        settings: { ...activePage.settings, ...patch },
      });
    },
    [activePage, updatePage],
  );

  const updateCover = useCallback(
    (cover: Page["cover"]) => {
      if (!activePage) return;
      updatePage({ ...activePage, cover });
    },
    [activePage, updatePage],
  );

  return {
    pages,
    activePage,
    isLoading,
    setActivePageId,
    updateSettings,
    updateCover,
    addPage: addPageAndActivate, // ← replaces the original addPage
    deletePage,
    query,
    onSearch,
    updatePage,
  };
}
