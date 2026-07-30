// A tiny module-level store for "after we navigate to a page, scroll to this
// node/thread." The inbox sets a target before navigating; the editor reads and
// clears it once the destination page's editor has mounted and rendered.
//
// Module-level (not context) because it must survive the route change and the
// editor remount that navigation triggers.

export interface ScrollTarget {
  pageId: string;
  targetNodeId?: string; // a mention nodeId, thread id, or page-comment marker
  type?: string; // notification type, to pick the scroll strategy
}

let pending: ScrollTarget | null = null;
const listeners = new Set<() => void>();

export function setPendingScrollTarget(t: ScrollTarget) {
  pending = t;
  listeners.forEach((l) => l());
}

export function consumePendingScrollTarget(
  pageId: string,
): ScrollTarget | null {
  if (pending && pending.pageId === pageId) {
    const t = pending;
    pending = null;
    return t;
  }
  return null;
}

export function subscribePendingScrollTarget(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
