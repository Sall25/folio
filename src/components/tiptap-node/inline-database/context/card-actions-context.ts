// ─── CardActionsContext ─────────────────────────────────────────────────────
// React context for the record/card action handlers. In-tree consumers
// (board/gallery cards) read it directly. The portaled drag-handle Menu reads
// the store fallback instead, since a document.body portal is outside the
// provider's tree.
import { createContext, useContext } from "react";
import type { CardActionsValue } from "./card-actions-context-value";
import { cardActionsStore } from "./card-actions-store";

export const CardActionsContext = createContext<CardActionsValue | null>(null);

/**
 * Read the card-action handlers. Returns the context value when used inside the
 * CardActionsProvider (board/gallery cards); falls back to the module store when
 * used outside the tree (the body-portaled drag-handle Menu). Returns null only
 * if neither is available (no active database), so callers should guard.
 */
export function useCardActions(): CardActionsValue | null {
  const ctx = useContext(CardActionsContext);
  if (ctx) return ctx;
  return cardActionsStore.get();
}
