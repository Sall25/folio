// Where the contents card goes so it stays on screen: it opens level with
// the progress lines and grows down, so near the bottom of the window (or
// with many headings) it moves up, and when it's taller than the window it
// scrolls inside.

export interface CardFit {
  /** Moves the card up (negative) from where it opens, in px. */
  offset: number;
  /** Tallest it can be; its list scrolls past this. */
  maxHeight: number;
}

export function fitCard({
  openTop,
  height,
  viewportHeight,
  margin = 16,
}: {
  /** Where the card's top is when it isn't moved, from the window's top. */
  openTop: number;
  /** The card's full height, everything shown. */
  height: number;
  viewportHeight: number;
  margin?: number;
}): CardFit {
  const maxHeight = Math.max(0, viewportHeight - margin * 2);
  const shown = Math.min(height, maxHeight);
  // Not past the bottom edge, then not past the top one.
  const top = Math.max(
    margin,
    Math.min(openTop, viewportHeight - margin - shown),
  );
  return { offset: Math.round(top - openTop), maxHeight };
}
