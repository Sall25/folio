import { useSyncExternalStore } from "react";
import type { ID } from "src/types";

// Moving a page into a teamspace asks first who should be able to open it
// (and the pages inside it): teamspace-move-dialog.tsx. Callers hand over
// the move itself; the dialog runs it after the choice, then applies the
// access.

export type TeamspaceMoveRequest = {
  pageId: ID;
  teamspaceId: ID;
  /** Does the move (patches the page). */
  move: () => Promise<unknown>;
};

let current: TeamspaceMoveRequest | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Ask before moving a page into a teamspace. */
export function requestTeamspaceMove(request: TeamspaceMoveRequest) {
  current = request;
  emit();
}

export function closeTeamspaceMove() {
  current = null;
  emit();
}

export function useTeamspaceMoveRequest(): TeamspaceMoveRequest | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => current,
  );
}
