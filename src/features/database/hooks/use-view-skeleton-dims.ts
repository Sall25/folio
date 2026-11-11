import { useCallback, useEffect } from "react";
import { useLocalStorage } from "src/hooks/use-local-storage";

// What a view looked like the last time it was on screen on this device, so
// its loading skeleton can take the same shape and size: one card when there
// was one card, no taller than the view was. Kept per view, in localStorage,
// beside the other per-device things (theme, sidebar width).

export interface ViewDims {
  columns: number;
  rows: number;
  rowHeight?: number;
  /** The whole database block, title and toolbar included (px). */
  height?: number;
  /** The view's body under the toolbar (px), for switching views. */
  bodyHeight?: number;
  /** Table: the visible columns' names and widths. */
  header?: { name: string; width: number }[];
  /** Board: cards in each column. */
  perColumn?: number[];
  /** Gallery and board: a card's size, and its cover's height (0: none). */
  cardWidth?: number;
  cardHeight?: number;
  coverHeight?: number;
}

const DEFAULTS: Record<string, ViewDims> = {
  table: { columns: 4, rows: 6, rowHeight: 34 },
  list: { columns: 4, rows: 6, rowHeight: 34 },
  board: { columns: 3, rows: 4 },
  gallery: { columns: 4, rows: 8 },
  calendar: { columns: 7, rows: 5 },
  timeline: { columns: 6, rows: 6 },
};

const keyOf = (databaseId: string, viewType: string, viewId?: string | null) =>
  `db-view-dims:${databaseId}:${viewId || viewType}`;

export function useViewSkeletonDims(
  databaseId: string,
  viewType: string,
  viewId?: string | null,
) {
  const key = keyOf(databaseId, viewType, viewId);
  // Saved before dims were kept per view: per database and view type.
  const legacyKey = keyOf(databaseId, viewType);
  const fallback = DEFAULTS[viewType] ?? DEFAULTS.table;
  const [legacy] = useLocalStorage<ViewDims>(legacyKey, fallback);
  const [dims, setDims] = useLocalStorage<ViewDims>(key, legacy);
  // Measured on this device before, or only the defaults: the loading state
  // shows the view's skeleton only when it's known.
  let known = false;
  try {
    known =
      localStorage.getItem(key) != null ||
      localStorage.getItem(legacyKey) != null;
  } catch {
    /* storage blocked */
  }

  const measure = useCallback(
    (next: Partial<ViewDims>) => {
      setDims((prev) => {
        const merged = { ...prev, ...next };
        return JSON.stringify(merged) === JSON.stringify(prev) ? prev : merged;
      });
    },
    [setDims],
  );

  return { dims, measure, known };
}

const px = (n: number | undefined) => (n ? Math.round(n) : undefined);

export function useMeasureViewDims(
  databaseId: string,
  viewType: string,
  ready: boolean,
  viewId?: string | null,
  /** Rows the view shows, from the data: an empty view is known too. */
  recordCount?: number,
) {
  const { measure } = useViewSkeletonDims(databaseId, viewType, viewId);

  useEffect(() => {
    if (!ready || typeof document === "undefined") return;

    // The block itself (it carries data-database-id), not a view inside it.
    const findScope = () =>
      document.querySelector<HTMLElement>(
        `.db-node[data-database-id="${databaseId}"]`,
      );

    const run = () => {
      const scope = findScope();
      if (!scope) return;

      // Only the fields actually measured: never undefined over a good value.
      const next: Partial<ViewDims> = {};
      const box = scope.getBoundingClientRect();
      if (box.height) next.height = px(box.height);
      const chrome = scope.querySelector<HTMLElement>(".db-sticky-left");
      if (chrome && box.height) {
        next.bodyHeight = px(box.bottom - chrome.getBoundingClientRect().bottom);
      }

      const records = Array.from(
        scope.querySelectorAll<HTMLElement>(".db-record"),
      );
      const rows = recordCount ?? records.length;

      if (viewType === "table") {
        next.rows = rows;
        const h = records[0]?.getBoundingClientRect().height;
        if (h) next.rowHeight = px(h);
        const ths = Array.from(scope.querySelectorAll<HTMLElement>(".db-th"));
        if (ths.length > 0) {
          next.columns = ths.length;
          next.header = ths.map((th) => ({
            name:
              th.querySelector(".tiptap-button-text")?.textContent?.trim() ??
              "",
            width: px(th.getBoundingClientRect().width) ?? 160,
          }));
        }
      } else if (viewType === "list") {
        next.rows = rows;
        const h = records[0]?.getBoundingClientRect().height;
        if (h) next.rowHeight = px(h);
      } else if (viewType === "board") {
        const heads = Array.from(
          scope.querySelectorAll<HTMLElement>(".db-board-col-header"),
        );
        if (heads.length > 0) {
          next.columns = heads.length;
          // A card belongs to the column whose header it sits under.
          const lefts = heads.map((h) => h.getBoundingClientRect().left);
          const per = lefts.map(() => 0);
          for (const card of scope.querySelectorAll<HTMLElement>(
            ".db-board-card",
          )) {
            const x = card.getBoundingClientRect().left;
            let best = 0;
            lefts.forEach((l, i) => {
              if (Math.abs(l - x) < Math.abs(lefts[best] - x)) best = i;
            });
            per[best] += 1;
          }
          next.perColumn = per;
          next.rows = Math.max(0, ...per);
        }
        measureCard(scope, next);
      } else if (viewType === "gallery") {
        next.rows = rows;
        measureCard(scope, next);
      } else {
        // Calendar and timeline: only the size, which is what keeps a
        // column from stretching.
      }

      measure(next);
    };

    // Cells stream in after the data: give them a beat. Then again whenever
    // the block changes size (a column resized, a card size changed).
    let t = window.setTimeout(run, 150);
    const scope = findScope();
    const ro =
      scope && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            window.clearTimeout(t);
            t = window.setTimeout(run, 400);
          })
        : null;
    if (scope) ro?.observe(scope);
    return () => {
      window.clearTimeout(t);
      ro?.disconnect();
    };
  }, [databaseId, viewType, viewId, ready, recordCount, measure]);
}

function measureCard(scope: HTMLElement, next: Partial<ViewDims>) {
  const card = scope.querySelector<HTMLElement>(".db-board-card");
  if (!card) return;
  const r = card.getBoundingClientRect();
  next.cardWidth = px(r.width);
  next.cardHeight = px(r.height);
  next.coverHeight =
    px(card.querySelector(".db-board-card__cover")?.getBoundingClientRect().height) ?? 0;
}
