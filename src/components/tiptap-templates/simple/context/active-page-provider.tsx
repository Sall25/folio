import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { ActivePageContext } from "./active-page-context";
import { useLocation, useNavigate } from "@tanstack/react-location";
import { usePage, usePages, useRecentPages } from "src/hooks/use-pages";
import type { ID } from "src/types";

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

  // Pages list = source of truth for existence. Recents = fallback target.
  const { data: pages } = usePages();
  const { data: recentPages } = useRecentPages();

  // When the active page is deleted, its id lingers in the URL but vanishes
  // from the list. Detect that and redirect — but only once the list has
  // actually loaded, so we don't act on a transient "not yet here" state.
  useEffect(() => {
    if (activePageId == null || pages == null) return;
    const stillExists = pages.some((p) => p.id === activePageId);
    if (stillExists) return;

    const fallback = recentPages?.find((p) => p.id !== activePageId);
    setActivePageId(fallback ? fallback.id : null);
  }, [activePageId, pages, recentPages, setActivePageId]);

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
