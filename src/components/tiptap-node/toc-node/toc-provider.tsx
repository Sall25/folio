// // toc-context.tsx
// import React, { useState, useCallback, useEffect } from "react";
// import type { TocItem } from "./toc-context";
// import { TocContext } from "./toc-context";
// import { useTiptapEditor } from "src/hooks/use-tiptap-editor";

// export function TocProvider({ children }: { children: React.ReactNode }) {
//   const [tocContent, setTocContent] = useState<TocItem[]>([]);
//   const [activeId, setActiveId] = useState<string | null>(null);
//   const [open, setOpen] = useState(false);

//   const showTocContent = () => setOpen(true);
//   const hideTocContent = () => setOpen(false);

//   const navigateToHeading = useCallback((item: TocItem, topOffset = 0) => {
//     const el = document.getElementById(item.id);
//     if (!el) return;
//     const y = el.getBoundingClientRect().top + window.scrollY - topOffset;
//     window.scrollTo({ top: y, behavior: "smooth" });
//     setActiveId(item.id);
//   }, []);

//   const computeActiveHeading = useCallback(() => {
//     const headings = tocContent
//       .map((item) => ({
//         id: item.id,
//         el: document.getElementById(item.id),
//       }))
//       .filter((h) => h.el);

//     let current: string | null = null;

//     for (const h of headings) {
//       const rect = h.el!.getBoundingClientRect();

//       if (rect.top <= 120) {
//         current = h.id;
//       }
//     }

//     setActiveId(current);
//   }, [tocContent]);

//   const { editor } = useTiptapEditor();

//   //update activeId on editor update
//   useEffect(() => {
//     if (!editor) return;

//     const updateHandler = () => {
//       computeActiveHeading();
//     };

//     editor.on("update", updateHandler);

//     return () => {
//       editor.off("update", updateHandler);
//     };
//   }, [editor, computeActiveHeading]);

//   // update activeId on scroll
//   useEffect(() => {
//     window.addEventListener("scroll", computeActiveHeading);

//     return () => {
//       window.removeEventListener("scroll", computeActiveHeading);
//     };
//   }, [computeActiveHeading]);

//   return (
//     <TocContext.Provider
//       value={{
//         tocContent,
//         setTocContent,
//         activeId,
//         setActiveId,
//         navigateToHeading,
//         normalizeDepths,
//         open,
//         showTocContent,
//         hideTocContent,
//       }}
//     >
//       {children}
//     </TocContext.Provider>
//   );
// }

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { TocItem } from "./toc-context";
import { TocContext } from "./toc-context";
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";
import { useActivePageId } from "src/components/tiptap-templates/simple/context/active-page-context";

function normalizeDepths(items: TocItem[]): number[] {
  if (!items.length) return [];
  //const minLevel = Math.min(...items.map(i => i.level))

  return items.map((item, idx) => {
    //const rebased = item.level - minLevel + 1
    const prevItems = items.slice(0, idx);
    const parent = [...prevItems].reverse().find((p) => p.level < item.level);

    if (!parent) return 1;

    const parentIdx = prevItems.indexOf(parent);
    const parentDepths = normalizeDepths(prevItems); //now safe — function is already declared
    return parentDepths[parentIdx] + 1;
  });
}
const ACTIVE_HEADING_KEY = "editor-active-heading";
const SCROLL_POSITION_KEY = "editor-scroll-position";

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
  const { activePageId } = useActivePageId();
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
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - topOffset;
    window.scrollTo({ top: y, behavior: "smooth" });
    setActiveId(item.id);
  }, []);

  const computeActiveHeading = useCallback(() => {
    const headings = tocContent
      .map((item) => ({ id: item.id, el: document.getElementById(item.id) }))
      .filter((h) => h.el);

    let current: string | null = null;
    for (const h of headings) {
      if (h.el!.getBoundingClientRect().top <= 120) {
        current = h.id;
      }
    }
    setActiveId(current);
  }, [tocContent]);

  // save heading and scroll on scroll
  useEffect(() => {
    const handler = () => {
      computeActiveHeading();
      if (activePageId) saveScrollPosition(activePageId, window.scrollY);
    };
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, [computeActiveHeading, activePageId]);

  // save activeId when it changes — only after restore is done
  useEffect(() => {
    if (!activeId || !activePageId) return;
    if (hasRestoredRef.current !== activePageId) return;
    saveActiveHeading(activePageId, activeId);
  }, [activeId, activePageId]);

  // restore scroll on page switch
  useEffect(() => {
    if (!activePageId) return;
    if (hasRestoredRef.current === activePageId) return;

    const savedHeadingId = getActiveHeadingCache()[activePageId];
    const savedScroll = getScrollCache()[activePageId];
    const topOffset = 60;

    requestAnimationFrame(() => {
      if (savedHeadingId) {
        const el = document.getElementById(savedHeadingId);
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - topOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
          hasRestoredRef.current = activePageId;
          return;
        }
      }

      if (savedScroll !== undefined) {
        window.scrollTo({ top: savedScroll, behavior: "smooth" });
      }

      hasRestoredRef.current = activePageId;
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
