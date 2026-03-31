import type { MeasuredThread, PositionedThread } from "../../types";

export function resolveThreadCollisions(measuredThreads: MeasuredThread[]): PositionedThread[] {
  const GAP = 12
  let cursor = 0

  return measuredThreads
    .sort((a, b) => a.anchorTop - b.anchorTop)
    .map(thread => {
      const top = Math.max(thread.anchorTop, cursor)
      cursor = top + thread.height + GAP

      return { ...thread, resolvedTop: top }
    })
}