import { useCallback, useEffect } from "react";
import { useLocalStorage } from "src/components/tiptap-templates/simple/hooks/use-local-storage";

export interface ViewDims {
  columns: number;
  rows: number;
  rowHeight?: number;
}

const DEFAULTS: Record<string, ViewDims> = {
  table: { columns: 4, rows: 6, rowHeight: 34 },
  list: { columns: 4, rows: 6, rowHeight: 34 },
  board: { columns: 3, rows: 4 },
  gallery: { columns: 4, rows: 8 },
  calendar: { columns: 7, rows: 5 },
  timeline: { columns: 6, rows: 6 },
};

export function useViewSkeletonDims(databaseId: string, viewType: string) {
  const key = `db-view-dims:${databaseId}:${viewType}`;
  const fallback = DEFAULTS[viewType] ?? DEFAULTS.table;
  const [dims, setDims] = useLocalStorage<ViewDims>(key, fallback);

  const measure = useCallback(
    (next: Partial<ViewDims>) => {
      setDims((prev) => {
        const merged = { ...prev, ...next };
        if (
          merged.columns === prev.columns &&
          merged.rows === prev.rows &&
          merged.rowHeight === prev.rowHeight
        ) {
          return prev;
        }
        return merged;
      });
    },
    [setDims],
  );

  return { dims, measure };
}

export function useMeasureViewDims(
  databaseId: string,
  viewType: string,
  ready: boolean,
) {
  const { measure } = useViewSkeletonDims(databaseId, viewType);

  useEffect(() => {
    if (!ready || typeof document === "undefined") return;

    const run = () => {
      // Scope: the wrapper must carry data-database-id={attrs.id}.
      const scope = document.querySelector<HTMLElement>(
        `[data-database-id="${databaseId}"]`,
      );
      if (!scope) return;

      // Build only the fields we actually measured — never write undefined
      // over a good default.
      const next: Partial<ViewDims> = {};

      if (viewType === "table") {
        const rowEls = scope.querySelectorAll<HTMLElement>(".db-record");
        next.rows = rowEls.length;
        const h = rowEls[0]?.getBoundingClientRect().height;
        if (h) next.rowHeight = h;
        const cols = scope.querySelectorAll(".db-th").length;
        if (cols > 0) next.columns = cols;
      } else if (viewType === "list") {
        const rowEls = scope.querySelectorAll<HTMLElement>(".db-list-row");
        next.rows = rowEls.length;
        const h = rowEls[0]?.getBoundingClientRect().height;
        if (h) next.rowHeight = h;
        // list columns = title + inline props of the first row
        const first = rowEls[0];
        const cols =
          (first?.querySelector(".db-list-row__props")?.children.length ?? 0) +
          1;
        if (cols > 1) next.columns = cols;
      } else if (viewType === "board") {
        const cols = scope.querySelectorAll(".db-board-col");
        if (cols.length > 0) next.columns = cols.length;
        next.rows = Math.max(
          0,
          ...Array.from(cols).map(
            (c) => c.querySelectorAll(".db-board-card").length,
          ),
        );
      } else if (viewType === "gallery") {
        const cards = scope.querySelectorAll(".db-gallery__card");
        next.rows = cards.length;
      } else {
        // calendar / timeline — no reliable selector yet; leave dims as default
        return;
      }

      // Only write when we got a real row/card count.
      if ((next.rows ?? 0) > 0) measure(next);
    };

    // Measure after paint. rAF once is often too early (cells stream in);
    // give it a beat so counts settle.
    const t = window.setTimeout(run, 120);
    return () => window.clearTimeout(t);
  }, [databaseId, viewType, ready, measure]);
}
