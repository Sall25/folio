import { useSyncExternalStore } from "react";

// Who's online in the workspace now, as WorkspacePresence last heard
// (workspace-presence.tsx): a small store, read with useWorkspaceOnline.

export interface OnlinePerson {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** The address they're on ("/page/…", "/chat/…", "/"…). */
  path: string;
}

let online: OnlinePerson[] = [];
const listeners = new Set<() => void>();

export function setOnline(next: OnlinePerson[]) {
  online = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getOnline = () => online;

/** Everyone online in the workspace now (you included), live. */
export function useWorkspaceOnline(): OnlinePerson[] {
  return useSyncExternalStore(subscribe, getOnline, getOnline);
}
