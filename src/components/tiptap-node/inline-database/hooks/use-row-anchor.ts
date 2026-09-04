import { useCallback, useEffect, useRef, useState } from "react";

export type AnchorRect = { top: number; left: number; height: number } | null;

/**
 * Tracks the viewport rect of a row so a portaled element can be pinned to it
 * with position:fixed — escaping the editor's clip boxes
 * (.simple-editor-main overflow-x:hidden, and the paint containment implied by
 * content-visibility:auto on .tiptap.ProseMirror).
 *
 * `top`/`height` track the ROW (so the checkbox follows it vertically), but
 * `left` is pinned to the TABLE container's left edge, not the row's — so on
 * horizontal scroll the checkbox stays frozen at the left instead of sliding
 * off with the row's scrolling left edge.
 *
 * `enabled` gates all listeners so unhovered/unselected rows cost nothing.
 *
 * The stored value carries the element it was measured from, so a rect
 * belonging to a previous element is derived away rather than cleared with a
 * synchronous setState in the effect body (which causes cascading renders).
 */
export function useRowAnchor(
  el: HTMLElement | null,
  enabled: boolean,
): AnchorRect {
  const [measured, setMeasured] = useState<{
    el: HTMLElement;
    rect: NonNullable<AnchorRect>;
  } | null>(null);
  const frame = useRef<number | null>(null);

  const measure = useCallback((node: HTMLElement) => {
    const box = node.closest(".react-renderer.node-databaseRecord") ?? node;
    const r = box.getBoundingClientRect();
    if (r.height === 0) return;

    // Pin `left` to the scroll container's edge so the checkbox stays put
    // during horizontal scroll. Table uses .db-table; list uses .db-list.
    const container = node.closest<HTMLElement>(".db-table, .db-list");
    const left = container ? container.getBoundingClientRect().left : r.left;

    setMeasured((prev) => {
      const next = { top: r.top, left, height: r.height };
      if (
        prev &&
        prev.el === node &&
        prev.rect.top === next.top &&
        prev.rect.left === next.left &&
        prev.rect.height === next.height
      ) {
        return prev;
      }
      return { el: node, rect: next };
    });
  }, []);

  useEffect(() => {
    if (!enabled || !el) return;

    const schedule = () => {
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        measure(el);
      });
    };

    // Deferred rather than called inline: a synchronous setState in the effect
    // body triggers a cascading render.
    schedule();

    // capture:true catches scrolls on any ancestor scroller, not just window
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);

    const box = el.closest(".react-renderer.node-databaseRecord") ?? el;
    const ro = new ResizeObserver(schedule);
    ro.observe(box);

    return () => {
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      ro.disconnect();
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
    };
  }, [el, enabled, measure]);

  // Derived, not stored: covers both the disabled case and a stale rect left
  // over from a previous element.
  if (!enabled || !el || measured?.el !== el) return null;
  return measured.rect;
}
