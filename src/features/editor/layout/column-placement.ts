// Where the page's column goes, and keeping the page from sliding sideways.

/** Space kept between the column and the visible area's edges (px). */
export const COLUMN_EDGE = 64;

export interface ColumnPlacement {
  /** From the editor wrapper's left edge: what blocks are shifted by. */
  offset: number;
  /** The most width the column may take. */
  room: number;
}

/**
 * The usual offset (`preferred`, the page's own spacing from the sidebar)
 * is kept whenever the column fits with it. On a narrower window the column
 * moves left just enough to fit, keeping COLUMN_EDGE from both edges;
 * narrower still, it gets narrower. It never starts left of the visible
 * area — and the visible area starts where the docked sidebar ends: the
 * page area runs under the sidebar (both start at the window's left), so
 * fitting the column to the page area alone put the title, cover and
 * skeletons under the sidebar on a smaller window. A side view's room
 * (`peekRoom`) doesn't count: opening one never moves the page.
 */
export function placeColumn({
  mainLeft,
  wrapperLeft,
  mainWidth,
  peekRoom = 0,
  coveredUntil = 0,
  columnWidth,
  preferred,
  edge = COLUMN_EDGE,
}: {
  /** The visible area (.simple-editor-main), from the window's left. */
  mainLeft: number;
  /** The editor wrapper, from the window's left. */
  wrapperLeft: number;
  /** The visible area's width, without its scrollbar. */
  mainWidth: number;
  peekRoom?: number;
  /** Where something over the page area's left part ends (the docked
   *  sidebar's right edge), from the window's left; 0 for nothing. */
  coveredUntil?: number;
  columnWidth: number;
  preferred: number;
  edge?: number;
}): ColumnPlacement {
  // The part of the page area that shows.
  const covered = Math.max(0, Math.min(mainWidth, coveredUntil - mainLeft));
  const left = mainLeft + covered - wrapperLeft;
  const width = mainWidth - covered + Math.max(0, peekRoom);
  const room = Math.max(0, Math.round(width - edge * 2));
  const column = Math.min(columnWidth, room);
  const minOffset = left + edge;
  const maxOffset = left + width - edge - column;
  const offset = Math.round(
    Math.max(minOffset, Math.min(preferred, maxOffset)),
  );
  return { offset, room };
}

export interface HorizontalScroller {
  scrollLeft: number;
  addEventListener(type: "scroll", listener: () => void): void;
  removeEventListener(type: "scroll", listener: () => void): void;
}

/**
 * Keeps an element that never scrolls sideways (overflow-x: hidden) at its
 * left edge. Hidden overflow still scrolls when the browser brings
 * something into view — a focused table cell, a selection, a wide block
 * while the window narrows — and then the page's title, cover and text
 * slide off the left edge with no way back. Returns the cleanup.
 */
export function pinScrollLeft(el: HorizontalScroller): () => void {
  const reset = () => {
    if (el.scrollLeft !== 0) el.scrollLeft = 0;
  };
  reset();
  el.addEventListener("scroll", reset);
  return () => el.removeEventListener("scroll", reset);
}
