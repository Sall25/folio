import { useCallback, useSyncExternalStore } from "react";
import type { ID } from "src/types";

// What a graph view is doing right now, shared between the panel and the
// canvas.
//
// Find and "what joins these two?" are asked in the layout panel, in the
// toolbar, and answered by a canvas somewhere else on the page. Neither can
// see the other's state, and none of it belongs in the view: a search term
// written into the document would arrive in everyone else's copy and show
// up in the page's history as an edit. So it is kept here, by view, for as
// long as the tab is open — the same bargain as the camera next door.

export interface GraphSession {
  /** What was typed into Find. The pages it matches are the lit ones. */
  query: string;
  /** Picking two pages to see what joins them: a press picks instead of
   *  opening while this is on. */
  pathMode: boolean;
  /** The pages picked so far — none, or one waiting for its pair. */
  picked: ID[];
  /** The chain the canvas found between them, for the panel to read back.
   *  Titles and all, because the panel does not hold the drawing. */
  chain: { id: ID; title: string }[];
}

const RESTING: GraphSession = {
  query: "",
  pathMode: false,
  picked: [],
  chain: [],
};

const sessions = new Map<ID, GraphSession>();
const listeners = new Map<ID, Set<() => void>>();

/** How this view stands. The same object until something changes it, so a
 *  component that reads it is not re-rendered for nothing. */
export function graphSession(viewId: ID | undefined): GraphSession {
  return (viewId && sessions.get(viewId)) || RESTING;
}

/** Change part of it, and tell whoever is watching. */
export function setGraphSession(
  viewId: ID | undefined,
  patch: Partial<GraphSession>,
): void {
  if (!viewId) return;
  sessions.set(viewId, { ...graphSession(viewId), ...patch });
  for (const run of listeners.get(viewId) ?? []) run();
}

/** Back to nothing typed and nothing picked. */
export function clearGraphSession(viewId: ID | undefined): void {
  if (!viewId) return;
  sessions.delete(viewId);
  for (const run of listeners.get(viewId) ?? []) run();
}

/** For tests, and for a view that is gone. */
export function forgetGraphSessions(): void {
  sessions.clear();
  listeners.clear();
}

export function subscribeGraphSession(
  viewId: ID | undefined,
  run: () => void,
): () => void {
  if (!viewId) return () => {};
  const forView = listeners.get(viewId) ?? new Set<() => void>();
  forView.add(run);
  listeners.set(viewId, forView);
  return () => {
    forView.delete(run);
    if (forView.size === 0) listeners.delete(viewId);
  };
}

/** The panel and the canvas both read it this way. */
export function useGraphSession(viewId: ID | undefined): GraphSession {
  const subscribe = useCallback(
    (run: () => void) => subscribeGraphSession(viewId, run),
    [viewId],
  );
  const read = useCallback(() => graphSession(viewId), [viewId]);
  return useSyncExternalStore(subscribe, read, read);
}
