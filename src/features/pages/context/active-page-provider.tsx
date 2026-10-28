import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-location";
import { usePage, usePagesBase, useRecentPages } from "src/hooks/use-pages";
import type { ID, Page } from "src/types";
import {
  teamspaceIdFromPath,
  spaceHomePath,
  spacePagePath,
} from "src/hooks/use-current-space";
import {
  ActivePageActionsContext,
  ActivePageStateContext,
  type ActivePageActions,
  type ActivePageState,
} from "./active-page-context";
import { isLocalPage } from "src/lib/local-pages";

export function ActivePageProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Matches both /page/:id and /t/:teamspaceId/page/:id.
  const activePageId = useMemo(() => {
    const match = location.current.pathname.match(/\/page\/([^/]+)/);
    return match ? match[1] : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.current.pathname]);

  const { data: activePage, isLoading } = usePage(activePageId);
  const { data: allPages } = usePagesBase((pages: Page[]) => pages);
  const { data: recentPages } = useRecentPages();

  // Read inside setActivePageId without making it a dependency, so the
  // action stays stable and navigation-trigger consumers don't re-render.
  const allPagesRef = useRef(allPages);
  useEffect(() => {
    allPagesRef.current = allPages;
  }, [allPages]);

  // Navigate within the current space when possible:
  //   • in a teamspace, a page of that teamspace (or one not in the cache
  //     yet — e.g. just created there) keeps the /t/:id prefix;
  //   • a page known to be outside it leaves the teamspace for the workspace;
  //   • null goes to the current space's home.
  const setActivePageId = useCallback(
    (id: ID | null) => {
      const currentTeamspaceId = teamspaceIdFromPath(location.current.pathname);
      if (id === null) {
        navigate({ to: spaceHomePath(currentTeamspaceId) });
        return;
      }
      const page = allPagesRef.current?.find((p) => p.id === id);
      const stayInTeamspace =
        currentTeamspaceId != null &&
        (!page || page.teamspaceId === currentTeamspaceId);
      navigate({
        to: spacePagePath(stayInTeamspace ? currentTeamspaceId : null, id),
      });
    },
    [navigate, location],
  );

  // The open page is gone (deleted, or no access) → fall back to a recent
  // page. A page shared with you from another workspace isn't in this
  // workspace's list, so wait for its own fetch before deciding.
  useEffect(() => {
    if (activePageId == null || allPages == null || isLoading) return;
    // Created on this device and not on the server yet: it exists, the
    // list just hasn't caught up (offline, the create is still queued).
    if (isLocalPage(activePageId)) return;
    // Moved to the trash counts as gone (also when a parent was trashed).
    const stillExists =
      allPages.some((p) => p.id === activePageId && p.deletedAt == null) ||
      (activePage?.id === activePageId && activePage.deletedAt == null);
    if (stillExists) return;
    const fallback = recentPages?.find((p) => p.id !== activePageId);
    setActivePageId(fallback ? fallback.id : null);
  }, [
    activePageId,
    allPages,
    recentPages,
    setActivePageId,
    isLoading,
    activePage,
  ]);

  const activePageRef = useRef(activePage);
  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage, isLoading, activePageId]);

  const actions = useMemo<ActivePageActions>(
    () => ({ setActivePageId }),
    [setActivePageId],
  );

  const state = useMemo<ActivePageState>(
    () => ({ activePageId, activePage: activePage ?? undefined, isLoading }),
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
