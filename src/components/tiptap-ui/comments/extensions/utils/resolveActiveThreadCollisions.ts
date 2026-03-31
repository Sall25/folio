import type { MeasuredThread, PositionedThread } from "../../types";

export function resolveActiveThreadCollisions(measuredThreads: MeasuredThread[], activeId: string): PositionedThread[] {
  const GAP = 12

  const sorted = [...measuredThreads].sort(
    (a, b) => a.anchorTop - b.anchorTop
  )

  const activeIndex = sorted.findIndex(t => t.id === activeId)

  const resolved = sorted.map(t => ({
    ...t,
    resolvedTop: t.anchorTop
  }))

  // push downward
  for (let i = activeIndex + 1; i < resolved.length; i++) {
    const prev = resolved[i - 1]
    const curr = resolved[i]

    const minTop = prev.resolvedTop + prev.height + GAP

    curr.resolvedTop = Math.max(curr.anchorTop, minTop)
  }

  // push upward
  for (let i = activeIndex - 1; i >= 0; i--) {
    const next = resolved[i + 1]
    const curr = resolved[i]

    const maxTop = next.resolvedTop - curr.height - GAP

    curr.resolvedTop = Math.min(curr.anchorTop, maxTop)
  }

  return resolved.map(t => ({
    ...t,
    offset: t.resolvedTop - t.anchorTop
  }))

}