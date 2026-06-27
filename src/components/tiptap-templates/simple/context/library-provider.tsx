import { useCallback, useMemo, type ReactNode } from "react";
import { LibraryContext } from "./library-context";
import type { LibraryTab } from "../components/library-palette";
import { useLocation, useNavigate } from "@tanstack/react-location";

export function LibraryProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = useMemo(() => {
    const match = location.current.pathname.match(/\/library\/([^/]+)/);
    return match ? (match[1] as LibraryTab) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.current.pathname]);

  const setActiveTab = useCallback(
    (providedTab: LibraryTab | null) => {
      if (providedTab === null) {
        const tab: LibraryTab = "Recents";
        navigate({ to: `/library/${tab}` });
      } else {
        const tab = providedTab;
        navigate({ to: `/library/${tab}` });
      }
    },
    [navigate],
  );

  return (
    <LibraryContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </LibraryContext.Provider>
  );
}
