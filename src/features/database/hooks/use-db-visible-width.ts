import { useCallback } from "react";
import { dbSizeFor, setDbSize } from "../utils/db-size";

/**
 * Callback ref for the database's sticky strip (`.db-sticky-left`, inside a
 * `.db-node`). Keeps `--db-visible-width` on the `.db-node` set to the width
 * of its visible area (its content box), so parts that stay put while the
 * table scrolls sideways (the title bar, the toolbar) are never wider than
 * what you can see. Writes a CSS variable, no React state.
 *
 * It also sizes the database's room (utils/db-size.ts) from the strip's own
 * width, which is already capped at both the editor's width and the visible
 * area: `data-db-size` on the `.db-node` for CSS, and the size store for
 * views that change behaviour.
 */
export function useDbVisibleWidth() {
  return useCallback((el: HTMLElement | null) => {
    const node = el?.closest<HTMLElement>(".db-node");
    if (!el || !node) return;

    const update = () => {
      const cs = getComputedStyle(node);
      const width =
        node.clientWidth -
        parseFloat(cs.paddingLeft || "0") -
        parseFloat(cs.paddingRight || "0");
      node.style.setProperty("--db-visible-width", `${Math.max(0, width)}px`);

      const size = dbSizeFor(el.getBoundingClientRect().width);
      if (size === "wide") delete node.dataset.dbSize;
      else node.dataset.dbSize = size;
      const id = node.dataset.databaseId;
      if (id) setDbSize(id, size);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
}
