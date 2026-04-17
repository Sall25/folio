import { useEffect, useRef, useState } from "react";
import { useToc } from "./use-toc";
import { Card } from "src/components/tiptap-ui-primitive/card";

interface Props {
  maxShowCount?: number;
  topOffset?: number;
  className?: string;
}

export function TocContent({ maxShowCount = 20, topOffset = 0 }: Props) {
  const {
    tocContent,
    activeId,
    open,
    hideTocContent,
    navigateToHeading,
    normalizeDepths,
  } = useToc();
  const [scrollActiveId, setScrollActiveId] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const items = tocContent.slice(0, maxShowCount);
  const depths = normalizeDepths(items);

  useEffect(() => {
    const handler = () => {
      if (activeId) return;
      let current: string | null = null;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= topOffset + 20) {
          current = item.id;
        }
      }
      setScrollActiveId(current ?? items[0]?.id ?? null);
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, [items, topOffset, activeId]);

  const resolvedActive = activeId ?? scrollActiveId;
  const activeIndex = items.findIndex((i) => i.id === resolvedActive);

  if (!items.length) return null;

  return (
    <Card
      className="toc-sidebar__card"
      style={{
        pointerEvents: `${open ? "auto" : "none"}`,
        visibility: `${open ? "visible" : "hidden"}`,
        transform: `${open ? "translateX(-4px)" : "translateX(0)"}`,
      }}
      onMouseLeave={() => hideTocContent()}
    >
      <div className="toc-sidebar__wrapper">
        <nav className="toc-sidebar__nav">
          {items.map((item, i) => (
            <a
              key={item.id}
              ref={(el) => {
                itemRefs.current[item.id] = el;
              }}
              href={`#${item.id}`}
              className={`toc-sidebar__item ${resolvedActive === item.id || activeIndex === i ? "toc-sidebar__item--active" : ""}`}
              style={{ paddingLeft: `${(depths[i] - 1) * 12}px` }}
              onClick={(e) => {
                e.preventDefault();
                navigateToHeading(item, topOffset);
              }}
            >
              {item.textContent}
            </a>
          ))}
        </nav>
      </div>
    </Card>
  );
}
