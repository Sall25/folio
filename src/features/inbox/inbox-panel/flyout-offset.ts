// Where a notification's card opens, relative to the row it belongs to.
//
// The card is a Radix popover anchored to the row, and `sideOffset` is
// measured from the row's own edge. The row stops short of the panel's edge
// (the list's side padding, plus the scrollbar when the list is long), so a
// plain 10px gap is spent inside the panel and the card lands on the sidebar
// instead of beside it. The card and the sidebar share a background, so the
// two then read as one surface and the list looks covered.
//
// Measuring both edges keeps the gap the same whatever the list's padding is,
// whether the sidebar is resized, and whether a scrollbar is showing.

/** Space left between the panel's edge and the card, in px. */
export const FLYOUT_GAP = 12;

/**
 * The `sideOffset` a card needs to clear the panel it opens from.
 *
 * @param rowRight   right edge of the notification row, in viewport px
 * @param panelRight right edge of the panel holding the row
 * @param gap        space to leave between the panel and the card
 */
export function flyoutSideOffset(
  rowRight: number,
  panelRight: number,
  gap: number = FLYOUT_GAP,
): number {
  if (!Number.isFinite(rowRight) || !Number.isFinite(panelRight)) return gap;
  // Never pull the card back over the row: a row wider than its panel (an
  // unmeasured or mid-layout frame) still gets the plain gap.
  return Math.max(gap, panelRight - rowRight + gap);
}

/**
 * The right edge of the rows inside a scrolling list: its content box, with
 * the scrollbar taken off.
 */
export function rowRightEdge(body: HTMLElement): number {
  const right = body.getBoundingClientRect().right;
  const padRight = parseFloat(getComputedStyle(body).paddingRight) || 0;
  // getBoundingClientRect() spans the border box, which includes the
  // scrollbar; clientWidth doesn't.
  const scrollbar = Math.max(0, body.offsetWidth - body.clientWidth);
  return right - padRight - scrollbar;
}
