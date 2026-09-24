import { useSyncExternalStore } from "react";

// Whether the page-discussion drawer is open. A tiny external store so the
// toolbar button, the drawer, and later the Inbox can all drive it without a
// provider. Stays open while you move between pages, like a side panel.
let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function setPageChatOpen(next: boolean) {
  if (next === open) return;
  open = next;
  emit();
}

export function togglePageChat() {
  setPageChatOpen(!open);
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function usePageChatOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => open,
  );
}
