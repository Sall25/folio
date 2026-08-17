import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-location";
import { usePage, usePagesBase, useRecentPages } from "src/hooks/use-pages";
import type { ID, Page } from "src/types";
import {
  ActivePageActionsContext,
  ActivePageStateContext,
  type ActivePageActions,
  type ActivePageState,
} from "./active-page-context";

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
  const { data: allPages } = usePagesBase((pages: Page[]) => pages);
  const { data: recentPages } = useRecentPages();

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

  // Action: stable (setActivePageId depends only on stable navigate) →
  // this object never rebuilds → navigation-trigger consumers never re-render.
  const actions = useMemo<ActivePageActions>(
    () => ({ setActivePageId }),
    [setActivePageId],
  );

  // State: rebuilds when navigation/load changes.
  const state = useMemo<ActivePageState>(
    () => ({ activePageId, activePage, isLoading }),
    [activePageId, activePage, isLoading],
  );

  return (
    <ActivePageActionsContext.Provider value={actions}>
      <ActivePageStateContext.Provider value={state}>
        {children}
      </ActivePageStateContext.Provider>
    </ActivePageActionsContext.Provider>
  );
}
