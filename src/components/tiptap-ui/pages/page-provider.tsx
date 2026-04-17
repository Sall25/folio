import { useCallback, useEffect, useState } from "react";
import {
  pageService,
  type Page,
  type CreatePagePayload,
} from "src/services/page-service";
import { PageContext } from "./page-context";

export function PageProvider({ children }: { children: React.ReactNode }) {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    try {
      setError(null);
      const data = await pageService.list();
      setPages(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const createPage = useCallback(async (payload?: CreatePagePayload) => {
    const page = await pageService.create(payload);
    setPages((prev) => [...prev, page]);
    return page;
  }, []);

  const updatePage = useCallback(async (id: string, payload: Partial<Page>) => {
    const updated = await pageService.update(id, payload);
    setPages((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }, []);

  const deletePage = useCallback(async (id: string) => {
    await pageService.delete(id);
    setPages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <PageContext.Provider
      value={{
        pages,
        loading,
        error,
        createPage,
        updatePage,
        deletePage,
        refreshPages: fetchPages,
      }}
    >
      {children}
    </PageContext.Provider>
  );
}
