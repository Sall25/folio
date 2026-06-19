import type { MeasuredThread, PositionedThread } from "src/types";

const GAP = 22;

export function resolveActiveThreadCollisions(
  measuredThreads: MeasuredThread[],
  activeId: string,
): PositionedThread[] {
  const sorted = [...measuredThreads].sort((a, b) => a.anchorTop - b.anchorTop);

  const resolved = sorted.map((t) => ({
    ...t,
    resolvedTop: t.anchorTop,
  }));

  // String() both sides so a number id from json-server still matches.
  const activeIndex = resolved.findIndex((t) => t.id === activeId);

  // Active not in the measured set (filtered out / id mismatch / not in DOM):
  // fall back to plain top-down cascade so the column still lays out.
  if (activeIndex === -1) {
    for (let i = 1; i < resolved.length; i++) {
      const prev = resolved[i - 1];
      const curr = resolved[i];
      curr.resolvedTop = Math.max(
        curr.anchorTop,
        prev.resolvedTop + prev.height + GAP,
      );
    }
    return resolved.map((t) => ({ ...t, offset: t.resolvedTop - t.anchorTop }));
  }

  // push downward from the active thread
  for (let i = activeIndex + 1; i < resolved.length; i++) {
    const prev = resolved[i - 1];
    const curr = resolved[i];
    const minTop = prev.resolvedTop + prev.height + GAP;
    curr.resolvedTop = Math.max(curr.anchorTop, minTop);
  }

  // push upward from the active thread
  for (let i = activeIndex - 1; i >= 0; i--) {
    const next = resolved[i + 1];
    const curr = resolved[i];
    const maxTop = next.resolvedTop - curr.height - GAP;
    curr.resolvedTop = Math.min(curr.anchorTop, maxTop);
  }

  return resolved.map((t) => ({ ...t, offset: t.resolvedTop - t.anchorTop }));
}
