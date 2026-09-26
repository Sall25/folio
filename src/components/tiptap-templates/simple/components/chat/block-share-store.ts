import { useSyncExternalStore } from "react";

// A block picked from the drag-handle menu, on its way to a chat composer.
export interface SharedBlockDraft {
  pageId: string;
  blockId: string;
  snapshot: string;
  pageTitle: string;
}

// ── 1. "Discuss in chat…" was clicked → the destination dialog opens ────────
let request: SharedBlockDraft | null = null;
const requestListeners = new Set<() => void>();

export function requestDiscussBlock(draft: SharedBlockDraft) {
  request = draft;
  requestListeners.forEach((l) => l());
}

export function clearDiscussRequest() {
  request = null;
  requestListeners.forEach((l) => l());
}

export function useDiscussRequest(): SharedBlockDraft | null {
  return useSyncExternalStore(
    (fn) => {
      requestListeners.add(fn);
      return () => requestListeners.delete(fn);
    },
    () => request,
    () => request,
  );
}

// ── 2. A destination was picked → the matching composer takes the block ─────
// Keyed by room id, or pageChatKey(pageId) for a page's discussion (whose room
// id may not exist yet — it's created when the drawer opens).
const pending = new Map<string, SharedBlockDraft>();
const pendingListeners = new Set<() => void>();

export const pageChatKey = (pageId: string) => `page:${pageId}`;

export function setPendingBlock(key: string, draft: SharedBlockDraft) {
  pending.set(key, draft);
  pendingListeners.forEach((l) => l());
}

export function takePendingBlock(key: string): SharedBlockDraft | null {
  const draft = pending.get(key) ?? null;
  if (draft) pending.delete(key);
  return draft;
}

export function subscribePendingBlocks(fn: () => void): () => void {
  pendingListeners.add(fn);
  return () => pendingListeners.delete(fn);
}
