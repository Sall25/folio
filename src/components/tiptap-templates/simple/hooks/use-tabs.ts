import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { Page } from "../types";
import type { Tab } from "../components/tabs/types";

const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`;

type ViewKind = Tab["view"]; // "home" | "page" | "resources"

interface UseTabsArgs {
  pages: Page[] | undefined;
  /** Page shown by the current route; null on home/resources. */
  activePageId: Page["id"] | null;
  /** Current route view. */
  view: ViewKind;
  /** Navigate the app. Tabs drive routing; the route drives the active tab. */
  navigateToPage: (pageId: Page["id"]) => void;
  navigateToView: (view: Exclude<ViewKind, "page">) => void;
  /** Create a page and return it (mirror your sidebar's addPageAsync). */
  createPage: (title: string) => Promise<Page | undefined>;
}

export interface UseTabsResult {
  tabsRef: RefObject<Tab[]>;
  activeTabId: string;
  selectTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  reorderTabs: (from: number, to: number) => void;
  openInNewTab: (page: Page) => void;
  createAndOpen: (title: string) => Promise<void>;
  recentPageIds: Page["id"][];
}

export function useTabs({
  pages,
  activePageId,
  view,
  navigateToPage,
  navigateToView,
  createPage,
}: UseTabsArgs): UseTabsResult {
  const [tabs, setTabs] = useState<Tab[]>([]);

  // Does a tab correspond to the current route?
  const matches = useCallback(
    (t: Tab) =>
      view === "page"
        ? t.view === "page" && t.pageId === activePageId
        : t.view === view,
    [view, activePageId],
  );

  // activeTabId is *derived* from the route + open tabs — never stored, so
  // there's no setState-in-effect to keep it in sync.
  const activeTab = tabs.find(matches);
  const activeTabId = activeTab?.id ?? "";

  const tabsRef = useRef(tabs);
  // tabsRef.current = tabs;
  useEffect(() => {
    if (view === "page" && activePageId == null) return; // route not ready
    if (tabsRef.current.some(matches)) return;
    tabsRef.current = tabs.some(matches)
      ? tabs
      : [
          ...tabs,
          {
            id: newId(),
            view,
            pageId: view === "page" ? activePageId : null,
          },
        ];
  }, [matches, view, activePageId, tabs]);

  const selectTab = useCallback(
    (id: string) => {
      const tab = tabsRef.current.find((t) => t.id === id);
      if (!tab) return;
      if (tab.view === "page" && tab.pageId != null) navigateToPage(tab.pageId);
      else navigateToView(tab.view === "page" ? "home" : tab.view);
    },
    [navigateToPage, navigateToView],
  );

  const closeTab = useCallback(
    (id: string) => {
      const list = tabsRef.current;
      const idx = list.findIndex((t) => t.id === id);
      if (idx === -1) return;
      const next = list.filter((t) => t.id !== id);
      setTabs(next);

      if (id !== activeTabId) return; // closed a background tab; route stays
      const neighbor = next[idx] ?? next[idx - 1];
      if (neighbor?.view === "page" && neighbor.pageId != null)
        navigateToPage(neighbor.pageId);
      else if (neighbor)
        navigateToView(neighbor.view === "page" ? "home" : neighbor.view);
      else navigateToView("home");
    },
    [activeTabId, navigateToPage, navigateToView],
  );

  const reorderTabs = useCallback((from: number, to: number) => {
    setTabs((prev) => {
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= prev.length ||
        to >= prev.length
      )
        return prev;
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  // Opening an already-open page just activates its tab (no duplicate) — the
  // route change re-derives activeTabId. Matches Notion's behaviour.
  const openInNewTab = useCallback(
    (page: Page) => navigateToPage(page.id),
    [navigateToPage],
  );

  const createAndOpen = useCallback(
    async (title: string) => {
      const page = await createPage(title);
      if (page?.id != null) navigateToPage(page.id);
    },
    [createPage, navigateToPage],
  );

  const recentPageIds = useMemo(
    () =>
      (pages ?? [])
        .filter((p) => p.updatedAt !== null && p.category !== "Template")
        .sort(
          (a, b) =>
            new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime(),
        )
        .map((p) => p.id),
    [pages],
  );

  return {
    tabsRef,
    activeTabId,
    selectTab,
    closeTab,
    reorderTabs,
    openInNewTab,
    createAndOpen,
    recentPageIds,
  };
}
