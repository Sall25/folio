// Bringing a page back to where it was left, once its content is there.
//
// A page's content arrives in steps (the collab doc syncs, then databases,
// images and embeds load and grow the page), and other things may scroll
// meanwhile (the editor showing its selection, a block mounting). So one
// scrollTo when the page opens lands short or gets undone. Instead, every
// frame: wait until the target is known, put the scroll there, and stop once
// it has stayed there with the page no longer growing — or when the person
// scrolls, clicks or types themselves, or after a few seconds whatever
// happens.

export interface ScrollBox {
  scrollTop: number;
  readonly scrollHeight: number;
  readonly clientHeight: number;
}

export type RestoreEnd = "settled" | "timeout" | "cancelled";

export interface RestoreOptions {
  /** Where to scroll to, or null while that isn't known yet (the page's
   *  content isn't on screen). Asked every frame. */
  target: () => number | null;
  /** Called once, when restoring ends. */
  onEnd?: (reason: RestoreEnd) => void;
  /** At the target, with the page not growing, for this long: done. */
  settleMs?: number;
  /** Give up after this long, wherever it is. */
  timeoutMs?: number;
  /** Next frame (requestAnimationFrame); returns a canceller. */
  schedule?: (run: () => void) => () => void;
  now?: () => number;
}

const defaultSchedule = (run: () => void) => {
  const id = requestAnimationFrame(run);
  return () => cancelAnimationFrame(id);
};

/** Close enough: scrollTop can be fractional on zoomed screens. */
const near = (a: number, b: number) => Math.abs(a - b) <= 1;

export function restoreScroll(box: ScrollBox, options: RestoreOptions) {
  const {
    target,
    onEnd,
    settleMs = 800,
    timeoutMs = 6000,
    schedule = defaultSchedule,
    now = () => Date.now(),
  } = options;

  const start = now();
  let lastChange = start;
  let lastHeight = -1;
  let lastTarget: number | null = null;
  let cancelFrame: (() => void) | null = null;
  let ended = false;

  const end = (reason: RestoreEnd) => {
    if (ended) return;
    ended = true;
    cancelFrame?.();
    cancelFrame = null;
    onEnd?.(reason);
  };

  const step = () => {
    cancelFrame = null;
    if (ended) return;
    const t = now();
    if (t - start >= timeoutMs) return end("timeout");

    const want = target();
    if (want == null) {
      lastChange = t;
    } else {
      const goal = Math.max(0, Math.round(want));
      if (goal !== lastTarget || box.scrollHeight !== lastHeight) {
        lastTarget = goal;
        lastHeight = box.scrollHeight;
        lastChange = t;
      }
      if (!near(box.scrollTop, goal)) {
        // The browser stops at the bottom when the page isn't tall enough
        // yet; asked again next frame as it grows.
        box.scrollTop = goal;
        lastChange = t;
      }
      const reachable = box.scrollHeight - box.clientHeight >= goal - 1;
      if (reachable && near(box.scrollTop, goal) && t - lastChange >= settleMs) {
        return end("settled");
      }
    }
    cancelFrame = schedule(step);
  };

  cancelFrame = schedule(step);

  return {
    /** The person took over (scrolled, clicked, typed): leave it be. */
    cancel: () => end("cancelled"),
    get done() {
      return ended;
    },
  };
}

// ── Where each page was left, on this device ─────────────────────────────

const SCROLL_POSITION_KEY = "editor-scroll-position";
/** Only the most recently left pages are kept. */
const MAX_PAGES = 200;

export function readScrollPositions(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(SCROLL_POSITION_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function savedScrollPosition(pageId: string): number | undefined {
  const value = readScrollPositions()[pageId];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function saveScrollPosition(pageId: string, top: number) {
  try {
    const cache = readScrollPositions();
    // Re-inserted last, so the oldest pages are the first ones dropped.
    delete cache[pageId];
    cache[pageId] = Math.max(0, Math.round(top));
    const ids = Object.keys(cache);
    for (const id of ids.slice(0, Math.max(0, ids.length - MAX_PAGES))) {
      delete cache[id];
    }
    localStorage.setItem(SCROLL_POSITION_KEY, JSON.stringify(cache));
  } catch {
    /* storage blocked or full */
  }
}

/** A link to a block (#id) takes the page there: no restoring over it.
 *  #view=… only picks a database view. */
export function linksToBlock(hash: string): boolean {
  const h = hash.replace(/^#/, "");
  return h.length > 0 && !h.startsWith("view=");
}
