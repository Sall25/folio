import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { ActivePageContext } from "./active-page-context";
import { useLocation, useNavigate } from "@tanstack/react-location";
import { usePage, usePagesBase, useRecentPages } from "src/hooks/use-pages";
import type { ID, Page } from "src/types";

export function ActivePageProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const activePageId = useMemo(() => {
    const match = location.current.pathname.match(/\/page\/([^/]+)/);
    return match ? match[1] : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.current.pathname]);

  const setActivePageId = useCallback(
    (id: ID | null) => {
      if (id === null) navigate({ to: "/" });
      else navigate({ to: `/page/${id}` });
    },
    [navigate],
  );

  const { data: activePage, isLoading } = usePage(activePageId);

  // Existence check for the "page was deleted → redirect" guard below.
  // IMPORTANT: this MUST use the UNFILTERED page list. usePages() filters out
  // records (sourceId != null), so using it here made every database record
  // look "deleted" the instant you navigated to it — bouncing you back to a
  // fallback (usually the record's parent) and, in the transition, saving the
  // record's content onto that parent. Records are real pages; they exist.
  const { data: allPages } = usePagesBase((pages: Page[]) => pages);
  const { data: recentPages } = useRecentPages();

  // When the active page is genuinely deleted, its id lingers in the URL but
  // vanishes from the list. Detect that and redirect — but only once the list
  // has actually loaded, so we don't act on a transient "not yet here" state.
  useEffect(() => {
    if (activePageId == null || allPages == null) return;
    const stillExists = allPages.some((p) => p.id === activePageId);
    if (stillExists) return;

    const fallback = recentPages?.find((p) => p.id !== activePageId);
    setActivePageId(fallback ? fallback.id : null);
  }, [activePageId, allPages, recentPages, setActivePageId]);

  const activePageRef = useRef(activePage);

  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage, isLoading, activePageId]);

  return (
    <ActivePageContext.Provider
      value={{
        setActivePageId,
        activePageId,
        isLoading,
        activePage,
      }}
    >
      {children}
    </ActivePageContext.Provider>
  );
}
