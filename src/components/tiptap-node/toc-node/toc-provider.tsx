// toc-context.tsx
import React, { useState, useCallback, useEffect } from "react";
import type { TocItem } from "./toc-context";
import { TocContext } from "./toc-context";
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";

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

export function TocProvider({ children }: { children: React.ReactNode }) {
  const [tocContent, setTocContent] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const showTocContent = () => setOpen(true);
  const hideTocContent = () => setOpen(false);

  const navigateToHeading = useCallback((item: TocItem, topOffset = 0) => {
    const el = document.getElementById(item.id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - topOffset;
    window.scrollTo({ top: y, behavior: "smooth" });
    setActiveId(item.id);
  }, []);

  const computeActiveHeading = useCallback(() => {
    const headings = tocContent
      .map((item) => ({
        id: item.id,
        el: document.getElementById(item.id),
      }))
      .filter((h) => h.el);

    let current: string | null = null;

    for (const h of headings) {
      const rect = h.el!.getBoundingClientRect();

      if (rect.top <= 120) {
        current = h.id;
      }
    }

    setActiveId(current);
  }, [tocContent]);

  const { editor } = useTiptapEditor();

  //update activeId on editor update
  useEffect(() => {
    if (!editor) return;

    const updateHandler = () => {
      computeActiveHeading();
    };

    editor.on("update", updateHandler);

    return () => {
      editor.off("update", updateHandler);
    };
  }, [editor, computeActiveHeading]);

  // update activeId on scroll
  useEffect(() => {
    window.addEventListener("scroll", computeActiveHeading);

    return () => {
      window.removeEventListener("scroll", computeActiveHeading);
    };
  }, [computeActiveHeading]);

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
