import { useCallback, useSyncExternalStore } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Which table / list rows are near the screen.
//
// Every cell of a database is its own node view, mounted whether it's on
// screen or not: a 200-row × 8-column table is ~1,600 Cell components. With
// this store, a row's cells render their real content only once the row has
// come within MARGIN of the visible area; until then they render an empty,
// row-height placeholder (database-cell-node-view.tsx).
//
// A row stays mounted once it has been near (we never unmount on the way
// out): scrolling back is instant, an edit in progress is never torn down,
// and rows above the screen never change height under the reader.
//
// The record view (database-record-node-view.tsx) registers its row box with
// observeRecord(); the cells read useRecordNearScreen(). Keys are
// `${databaseId}:${recordId}`, so two views of the same rows on one page are
// tracked separately.
// ─────────────────────────────────────────────────────────────────────────────

/** How far beyond the visible area rows start rendering, in px. About one
 *  screen: fast scrolling still lands on rendered rows. */
const MARGIN = 800;

const near = new Set<string>();
const listeners = new Map<string, Set<() => void>>();
let revealedAll = false;
const allListeners = new Set<() => void>();

const keyOf = (databaseId: string, recordId: string) =>
  `${databaseId}:${recordId}`;

function notify(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

function markNear(key: string) {
  if (near.has(key)) return;
  near.add(key);
  notify(key);
}

/**
 * Render every row now, near the screen or not. For anything that reads the
 * whole page's DOM: PDF export (export-utils.ts) and the browser's print.
 */
export function revealAllRecords() {
  if (revealedAll) return;
  revealedAll = true;
  // Every subscriber is in allListeners (see useRecordNearScreen).
  allListeners.forEach((fn) => fn());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeprint", revealAllRecords);
}

// ── Observing ────────────────────────────────────────────────────────────────

// The element that scrolls the page vertically. It has to be the observer's
// root: an observer on the viewport ignores rootMargin for anything clipped
// by a scrolling ancestor, so rows would only render once already on screen.
//
// The editor's scroller is known by class: while a page is still loading it
// may not scroll yet, so the generic test below would miss it. Anything else
// (another scrolling panel) is found by walking up.
function scrollRootOf(el: Element): Element | null {
  const known = el.closest(".simple-editor-main, [data-scroll-root]");
  if (known) return known;
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    // overflow-x: auto alone (.db-node) computes overflow-y to auto as well,
    // so also require that it actually scrolls vertically.
    if (
      (overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowY === "overlay") &&
      p.scrollHeight > p.clientHeight + 1
    ) {
      return p;
    }
  }
  return null; // the page itself scrolls (or nothing does)
}

const observers = new Map<Element | null, IntersectionObserver>();
const keyByElement = new WeakMap<Element, string>();

function observerFor(root: Element | null): IntersectionObserver {
  let io = observers.get(root);
  if (!io) {
    io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const key = keyByElement.get(entry.target);
          if (key) markNear(key);
          // Near once is near for good: nothing more to watch.
          io!.unobserve(entry.target);
        }
      },
      { root, rootMargin: `${MARGIN}px 0px` },
    );
    observers.set(root, io);
  }
  return io;
}

// Synchronous first check, so rows already on screen render their cells in
// the same frame instead of flashing empty until the observer's first
// (asynchronous) callback.
function isNearNow(el: Element, root: Element | null): boolean {
  const r = el.getBoundingClientRect();
  // display: none (a filtered-out row) has no box: not near; the observer
  // reports it once it shows.
  if (r.width === 0 && r.height === 0) return false;
  const top = root ? root.getBoundingClientRect().top : 0;
  const bottom = root
    ? root.getBoundingClientRect().bottom
    : window.innerHeight;
  return r.bottom >= top - MARGIN && r.top <= bottom + MARGIN;
}

/**
 * The views whose records are rows of cells: a table, a list, and the table
 * beside a timeline's grid. Board, gallery and calendar records draw their
 * own content instead and never mount a cell's DOM.
 *
 * Both halves of the arrangement above read this, and they have to agree. A
 * cell renders its content only once its row reports in; a row that never
 * reports leaves every one of its cells on the empty placeholder for good.
 * Written out twice, it came apart exactly there: the timeline was added to
 * the cells' list and not to the rows', and its panel showed rows with no
 * name in them.
 */
export function showsRecordsAsRows(viewType: string | undefined): boolean {
  return viewType === "table" || viewType === "list" || viewType === "timeline";
}

/**
 * Start watching a row box. Call from a layout effect; returns the cleanup.
 * `el` must be the row's real box (the record's renderer element), not a
 * display: contents wrapper, which has no box to intersect.
 */
export function observeRecord(
  el: Element,
  databaseId: string,
  recordId: string,
): () => void {
  const key = keyOf(databaseId, recordId);
  if (revealedAll || near.has(key)) return () => {};

  if (typeof IntersectionObserver === "undefined") {
    markNear(key);
    return () => {};
  }

  const root = scrollRootOf(el);
  if (isNearNow(el, root)) {
    markNear(key);
    return () => {};
  }

  const io = observerFor(root);
  keyByElement.set(el, key);
  io.observe(el);
  return () => {
    io.unobserve(el);
    keyByElement.delete(el);
  };
}

// ── Reading ──────────────────────────────────────────────────────────────────

/** True once this row has been near the screen (or everything was revealed). */
export function useRecordNearScreen(
  databaseId: string | null,
  recordId: string | null,
): boolean {
  const key = databaseId && recordId ? keyOf(databaseId, recordId) : null;

  const subscribe = useCallback(
    (onChange: () => void) => {
      allListeners.add(onChange);
      if (!key) {
        return () => {
          allListeners.delete(onChange);
        };
      }
      let set = listeners.get(key);
      if (!set) {
        set = new Set();
        listeners.set(key, set);
      }
      set.add(onChange);
      return () => {
        allListeners.delete(onChange);
        const s = listeners.get(key);
        s?.delete(onChange);
        if (s && s.size === 0) listeners.delete(key);
      };
    },
    [key],
  );

  const getSnapshot = useCallback(
    () => revealedAll || (key !== null && near.has(key)),
    [key],
  );

  return useSyncExternalStore(subscribe, getSnapshot);
}
