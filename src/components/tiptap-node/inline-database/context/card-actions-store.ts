// ─── Card actions store ─────────────────────────────────────────────────────
// The drag-handle Menu is portaled to document.body — OUTSIDE the React tree,
// so it can't read the CardActionsContext. This module store is the bridge:
// CardActionsProvider publishes the current handler bundle here, and the
// portaled menu reads it (the same pattern recordSelection uses to cross that
// boundary). In-tree consumers (board/gallery cards) use the context directly;
// only the portal falls back to this.
//
// Holds ONE bundle (the active database's). That's sufficient because only one
// card/record menu is open at a time. If simultaneous menus across databases
// ever happen, key this by databaseId.
import type { CardActionsValue } from "./card-actions-context-value";

let current: CardActionsValue | null = null;

export const cardActionsStore = {
  set(value: CardActionsValue) {
    current = value;
  },
  clear() {
    current = null;
  },
  get(): CardActionsValue | null {
    return current;
  },
};
