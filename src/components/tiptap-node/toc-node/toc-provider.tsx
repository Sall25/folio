import React, { useState, useCallback, useEffect, useRef } from "react";
import type { TocItem } from "./toc-context";
import { TocContext } from "./toc-context";
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";
import { useActivePage } from "src/components/tiptap-templates/simple/use-active-page";

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
const SCROLL_POSITION_KEY = "editor-scroll-position";

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

const getScrollCache = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(SCROLL_POSITION_KEY) ?? "{}");
  } catch {
    return {};
  }
};

const saveScrollPosition = (pageId: string, scroll: number) => {
  const cache = getScrollCache();
  cache[pageId] = scroll;
  localStorage.setItem(SCROLL_POSITION_KEY, JSON.stringify(cache));
};

export function TocProvider({ children }: { children: React.ReactNode }) {
  const [tocContent, setTocContent] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { activePageId } = useActivePage();
  const { editor } = useTiptapEditor();
  const hasRestoredRef = useRef<string | null>(null);

  const showTocContent = () => setOpen(true);
  const hideTocContent = () => setOpen(false);

  // reset on page switch
  useEffect(() => {
    const raf = requestAnimationFrame(() => setActiveId(null));
    return () => cancelAnimationFrame(raf);
  }, [activePageId]);

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
    setActiveId(item.id);
  }, []);

  const computeActiveHeading = useCallback(() => {
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

  // save heading and scroll on scroll
  useEffect(() => {
    const container = getScrollContainer();
    if (!container) return;
    const handler = () => {
      computeActiveHeading();
      if (activePageId)
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

  // restore scroll on page switch
  useEffect(() => {
    if (activePageId === undefined) return;
    if (hasRestoredRef.current === activePageId.toString()) return;

    const savedHeadingId = getActiveHeadingCache()[activePageId];
    const savedScroll = getScrollCache()[activePageId];
    const topOffset = 60;

    requestAnimationFrame(() => {
      const container = getScrollContainer();
      if (!container) return;

      if (!savedHeadingId) {
        container.scrollTo({ top: 0, behavior: "smooth" });
        hasRestoredRef.current = activePageId.toString();
        return;
      }

      const el = document.getElementById(savedHeadingId);
      if (el) {
        const y =
          el.getBoundingClientRect().top -
          container.getBoundingClientRect().top +
          container.scrollTop -
          topOffset;
        container.scrollTo({ top: y, behavior: "smooth" });
        hasRestoredRef.current = activePageId.toString();
        return;
      }

      if (savedScroll !== undefined) {
        container.scrollTo({ top: savedScroll, behavior: "smooth" });
      }
      hasRestoredRef.current = activePageId.toString();
    });
  }, [activePageId, tocContent]);

  // update activeId on editor update
  useEffect(() => {
    if (!editor) return;
    editor.on("update", computeActiveHeading);
    return () => {
      editor.off("update", computeActiveHeading);
    };
  }, [editor, computeActiveHeading]);

  return (
    <TocContext.Provider
      value={{
        tocContent,
        setTocContent,
        activeId,
        setActiveId,
        navigateToHeading,
        normalizeDepths,
        open,
        showTocContent,
        hideTocContent,
      }}
    >
      {children}
    </TocContext.Provider>
  );
}
