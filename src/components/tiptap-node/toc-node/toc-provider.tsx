import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import type { TocItem } from "./toc-context";
import {
  TocActionsContext,
  TocContentContext,
  TocUIStateContext,
} from "./toc-context";
import { useActivePageState } from "src/features/pages/context/active-page-context";
import {
  linksToBlock,
  restoreScroll,
  saveScrollPosition,
  savedScrollPosition,
} from "./scroll-restore";

function normalizeDepths(items: TocItem[]): number[] {
  if (!items.length) return [];
  return items.map((item, idx) => {
    const prevItems = items.slice(0, idx);
    const parent = [...prevItems].reverse().find((p) => p.level < item.level);
    if (!parent) return 1;
    const parentIdx = prevItems.indexOf(parent);
    const parentDepths = normalizeDepths(prevItems);
    return parentDepths[parentIdx] + 1;
  });
}

const ACTIVE_HEADING_KEY = "editor-active-heading";

const getScrollContainer = () =>
  document.querySelector(".simple-editor-main") as HTMLElement | null;

const getActiveHeadingCache = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_HEADING_KEY) ?? "{}");
  } catch {
    return {};
  }
};

const saveActiveHeading = (pageId: string, headingId: string) => {
  const cache = getActiveHeadingCache();
  cache[pageId] = headingId;
  localStorage.setItem(ACTIVE_HEADING_KEY, JSON.stringify(cache));
};


export function TocProvider({ children }: { children: React.ReactNode }) {
  const [tocContent, setTocContent] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { activePageId } = useActivePageState();
  const hasRestoredRef = useRef<string | null>(null);

  const showTocContent = useCallback(() => setOpen(true), []);
  const hideTocContent = useCallback(() => setOpen(false), []);

  // reset on page switch
  useEffect(() => {
    const raf = requestAnimationFrame(() => setActiveId(null));
    return () => cancelAnimationFrame(raf);
  }, [activePageId]);

  // While a click scrolls smoothly to a heading, keep that heading
  // highlighted instead of flickering through the ones scrolled past.
  const navigatingRef = useRef<{ id: string; until: number } | null>(null);

  const navigateToHeading = useCallback((item: TocItem, topOffset = 60) => {
    const el = document.getElementById(item.id);
    const container = getScrollContainer();
    if (!el || !container) return;
    const y =
      el.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      topOffset;
    container.scrollTo({ top: y, behavior: "smooth" });
    navigatingRef.current = { id: item.id, until: Date.now() + 900 };
    container.addEventListener(
      "scrollend",
      () => {
        navigatingRef.current = null;
      },
      { once: true },
    );
    setActiveId(item.id);
  }, []);

  const computeActiveHeading = useCallback(() => {
    const nav = navigatingRef.current;
    if (nav && Date.now() < nav.until) return;
    navigatingRef.current = null;
    const container = getScrollContainer();
    if (!container) return;
    const containerTop = container.getBoundingClientRect().top;

    const headings = tocContent
      .map((item) => ({ id: item.id, el: document.getElementById(item.id) }))
      .filter((h) => h.el);

    let current: string | null = null;
    for (const h of headings) {
      if (h.el!.getBoundingClientRect().top - containerTop <= 120) {
        current = h.id;
      }
    }
    setActiveId(current);
  }, [tocContent]);

  // save heading and scroll on scroll — only once this page is back where
  // it was left: until then the scroll events are the old page's content
  // going away and the new one's coming in, not the person.
  useEffect(() => {
    const container = getScrollContainer();
    if (!container) return;
    const handler = () => {
      computeActiveHeading();
      if (activePageId && hasRestoredRef.current === activePageId.toString())
        saveScrollPosition(activePageId.toString(), container.scrollTop);
    };
    container.addEventListener("scroll", handler);
    return () => container.removeEventListener("scroll", handler);
  }, [computeActiveHeading, activePageId]);

  // save activeId when it changes — only after restore is done
  useEffect(() => {
    if (!activePageId) return;
    if (hasRestoredRef.current !== activePageId.toString()) return;

    if (!activeId) {
      const cache = getActiveHeadingCache();
      delete cache[activePageId];
      localStorage.setItem(ACTIVE_HEADING_KEY, JSON.stringify(cache));
      return;
    }

    saveActiveHeading(activePageId.toString(), activeId);
  }, [activeId, activePageId]);

  // restore scroll on page switch: where it was left on this device (or,
  // saved before that was kept, the heading it was at; else the top), once
  // the page's own content is on screen, holding it there while the page
  // fills in. scroll-restore.ts has the why.
  useEffect(() => {
    if (activePageId === null) return;
    const pageId = activePageId.toString();
    if (hasRestoredRef.current === pageId) return;
    hasRestoredRef.current = null;

    const container = getScrollContainer();
    if (!container) return;
    const done = () => {
      hasRestoredRef.current = pageId;
    };
    if (linksToBlock(window.location.hash)) {
      done();
      return;
    }

    const savedScroll = savedScrollPosition(pageId);
    const savedHeadingId = getActiveHeadingCache()[pageId];
    const topOffset = 60;

    const restore = restoreScroll(container, {
      target: () => {
        // The new page's editor, not the old one or the loading skeleton.
        const content = container.querySelector(
          `.simple-editor-content[data-page-id="${CSS.escape(pageId)}"]`,
        );
        if (!content) return null;
        if (savedScroll !== undefined) return savedScroll;
        if (!savedHeadingId) return 0;
        const el = document.getElementById(savedHeadingId);
        if (!el) return 0;
        return (
          el.getBoundingClientRect().top -
          container.getBoundingClientRect().top +
          container.scrollTop -
          topOffset
        );
      },
      onEnd: done,
    });

    // The person scrolling, clicking or typing takes over.
    const takeOver = () => restore.cancel();
    const opts = { passive: true, capture: true } as const;
    container.addEventListener("wheel", takeOver, opts);
    container.addEventListener("touchstart", takeOver, opts);
    container.addEventListener("pointerdown", takeOver, opts);
    window.addEventListener("keydown", takeOver, opts);
    return () => {
      container.removeEventListener("wheel", takeOver, opts);
      container.removeEventListener("touchstart", takeOver, opts);
      container.removeEventListener("pointerdown", takeOver, opts);
      window.removeEventListener("keydown", takeOver, opts);
      // Left before it finished: nothing was restored here, so nothing of
      // this page gets saved from the next page's scrolling either.
      if (!restore.done) {
        restore.cancel();
        if (hasRestoredRef.current === pageId) hasRestoredRef.current = null;
      }
    };
  }, [activePageId]);

  // Headings changed (added, removed, renamed): recompute once the DOM has
  // them. tocContent drives computeActiveHeading, so no editor listener.
  useEffect(() => {
    const raf = requestAnimationFrame(computeActiveHeading);
    return () => cancelAnimationFrame(raf);
  }, [computeActiveHeading]);

  // ── Actions: memoized ONCE. Setters + useCallback'd fns are all stable. ──
  const actions = useMemo(
    () => ({
      setTocContent,
      setActiveId,
      navigateToHeading,
      normalizeDepths,
      showTocContent,
      hideTocContent,
    }),
    [navigateToHeading, showTocContent, hideTocContent],
  );

  // ── Content: rebuilds only when tocContent changes (editing headings). ──
  const content = useMemo(() => ({ tocContent }), [tocContent]);

  // ── UI state: rebuilds on scroll (activeId) and toggle (open) — the hot one. ──
  const uiState = useMemo(() => ({ activeId, open }), [activeId, open]);

  return (
    <TocActionsContext.Provider value={actions}>
      <TocContentContext.Provider value={content}>
        <TocUIStateContext.Provider value={uiState}>
          {children}
        </TocUIStateContext.Provider>
      </TocContentContext.Provider>
    </TocActionsContext.Provider>
  );
}
