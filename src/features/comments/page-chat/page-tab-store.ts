import { useCallback, useSyncExternalStore } from "react";
import type { ID } from "src/types";

// Which tab each page shows — its document or its chat (the page's comment
// threads as one conversation) — for this session. A store rather than
// state: the switch lives in the top bar and the chat in the page area,
// far apart in the tree.
//
// `backToChat`: the page was opened from the chat ("See in page"), so the
// page shows a "Back to chat" button until you switch tabs yourself.

export type PageTab = "page" | "chat";

type Entry = { tab: PageTab; backToChat: boolean; chatScroll: number };

const entries = new Map<ID, Entry>();
const listeners = new Set<() => void>();
const DEFAULT: Entry = { tab: "page", backToChat: false, chatScroll: -1 };

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const pageTabs = {
  get: (pageId: ID | null): Entry =>
    (pageId && entries.get(pageId)) || DEFAULT,
  set(pageId: ID, patch: Partial<Entry>) {
    entries.set(pageId, { ...pageTabs.get(pageId), ...patch });
    emit();
  },
};

/** The page's tab, and switching it (by hand: clears "Back to chat"). */
export function usePageTab(pageId: ID | null) {
  const entry = useSyncExternalStore(subscribe, () => pageTabs.get(pageId));
  const setTab = useCallback(
    (tab: PageTab) => {
      if (pageId) pageTabs.set(pageId, { tab, backToChat: false });
    },
    [pageId],
  );
  return { tab: entry.tab, backToChat: entry.backToChat, setTab };
}
