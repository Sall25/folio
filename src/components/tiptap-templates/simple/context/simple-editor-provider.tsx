import { useActivePage } from "../use-active-page";
import { usePages } from "../use-pages";
import { useThreadsOnPage } from "src/components/tiptap-ui/comments/hooks/use-threads-on-page";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SimpleEditorContext } from "./simple-editor-context";
import type { Page } from "../types";
import { useActivePageId } from "./active-page-context";

interface SimpleEditorProviderProps {
  children: ReactNode;
}

export function SimpleEditorProvider({ children }: SimpleEditorProviderProps) {
  const activePage = useActivePage();
  const { activePageId } = useActivePageId();
  const { addPageAsync } = usePages();
  const threads = useThreadsOnPage();

  const prevPageId = useRef<string | null>(null);
  const [localPage, setLocalPage] = useState<Page | null>(null);

  useEffect(() => {
    setLocalPage(null); // clear immediately on switch
  }, [activePageId]);

  useEffect(() => {
    if (activePage.activePage) {
      setLocalPage(activePage.activePage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePageId, activePage.isLoading]);

  const activePageCallbacksRef = useRef(activePage);
  useEffect(() => {
    activePageCallbacksRef.current = activePage;
  }, [activePage]);

  const updateCoverAsync = useCallback(async (cover: Page["cover"]) => {
    setLocalPage((p) => (p ? { ...p, cover } : p));
    await activePageCallbacksRef.current.updateCoverAsync(cover);
  }, []); // ← stable

  const updateSettingsAsync = useCallback(
    async (patch: Partial<Page["settings"]>) => {
      setLocalPage((p) =>
        p ? { ...p, settings: { ...p.settings, ...patch } } : p,
      );
      await activePageCallbacksRef.current.updateSettingsAsync(patch);
    },
    [],
  ); // ← stable

  const updatePageAsync = useCallback(async (page: Page) => {
    setLocalPage(page);
    return await activePageCallbacksRef.current.updatePageAsync(page);
  }, []); // ← stable

  const updatePageSilentAsync = useCallback(async (page: Page) => {
    return await activePageCallbacksRef.current.updatePageAsync(page);
  }, []); // ← stable

  return (
    <SimpleEditorContext.Provider
      value={{
        ...activePage,
        activePage: localPage,
        updateCoverAsync,
        updateSettingsAsync,
        updatePageAsync,
        addPageAsync,
        updatePageSilentAsync,
        ...threads,
      }}
    >
      {children}
    </SimpleEditorContext.Provider>
  );
}
