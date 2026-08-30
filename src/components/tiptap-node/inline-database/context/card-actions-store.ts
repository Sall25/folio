// ─── Card actions store ─────────────────────────────────────────────────────
// The drag-handle Menu is portaled to document.body — OUTSIDE the React tree,
// so it can't read the CardActionsContext. This module store is the bridge:
// CardActionsProvider publishes the current handler bundle here, and the
// portaled menu reads it (the same pattern recordSelection uses to cross that
// boundary). In-tree consumers (board/gallery cards) use the context directly;
// only the portal falls back to this.
//
// REACTIVE: the store notifies subscribers on every set/clear, so portaled
// consumers (via useSyncExternalStore in useCardActions) re-render when the
// provider republishes — e.g. after a favorite toggles and the bundle's
// isFavorite/getRecord reflect the new state. Without this, the portaled menu
// read a stale snapshot and never updated (the in-tree context path did update,
// which is why the toggle worked in the card menu but not the drag-handle menu).
//
// Holds ONE bundle (the active database's). Sufficient because only one
// card/record menu is open at a time. If simultaneous menus across databases
// ever happen, key this by databaseId.
import type { CardActionsValue } from "./card-actions-context-value";

let current: CardActionsValue | null = null;
const listeners = new Set<() => void>();

export const cardActionsStore = {
  set(value: CardActionsValue) {
    current = value;
    listeners.forEach((l) => l());
  },
  clear() {
    if (current === null) return;
    current = null;
    listeners.forEach((l) => l());
  },
  get(): CardActionsValue | null {
    return current;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
