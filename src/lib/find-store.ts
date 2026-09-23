import { useSyncExternalStore } from "react";
import type { FindOptions } from "src/lib/find-in-pages";

// Shared find-in-pages state: the sidebar input writes it, the results panel
// reads it. They're siblings (SidebarNav / SidebarBody), so a tiny external
// store beats threading a provider through Sidebar. Module-level, so the
// query survives the sidebar collapsing and reopening.

export interface FindState {
  query: string;
  options: FindOptions;
  /** Bumped to ask the sidebar input to focus itself (keyboard shortcut). */
  focusNonce: number;
}

let state: FindState = {
  query: "",
  options: { matchCase: false, wholeWord: false, regex: false },
  focusNonce: 0,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function setFindQuery(query: string) {
  if (query === state.query) return;
  state = { ...state, query };
  emit();
}

export function setFindOption<K extends keyof FindOptions>(
  key: K,
  value: FindOptions[K],
) {
  state = { ...state, options: { ...state.options, [key]: value } };
  emit();
}

export function requestFindFocus() {
  state = { ...state, focusNonce: state.focusNonce + 1 };
  emit();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useFindState(): FindState {
  return useSyncExternalStore(subscribe, () => state);
}
