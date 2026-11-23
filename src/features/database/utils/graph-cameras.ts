import type { ID } from "src/types";
import type { Camera } from "./graph-camera";

// Where each graph view was last looking.
//
// Switching to the table and back tears the canvas down and builds it
// again, and a canvas that came back at the start every time would make
// anyone who had found their way somewhere do it again. So it is kept here,
// by view, for as long as the tab is open.
//
// Deliberately not in the document: a camera is not content. Writing it
// there would put a change into everyone else's copy of the view on every
// turn of the wheel, and show up in the page's history as an edit.

const cameras = new Map<ID, Camera>();

/** Where this view was looking, if it has looked anywhere yet. */
export function rememberedCamera(viewId: ID | undefined): Camera | undefined {
  return viewId ? cameras.get(viewId) : undefined;
}

export function rememberCamera(viewId: ID | undefined, camera: Camera): void {
  if (viewId) cameras.set(viewId, camera);
}

/** For tests, and for a view that is gone. */
export function forgetCamera(viewId?: ID): void {
  if (viewId) cameras.delete(viewId);
  else cameras.clear();
}

// ── Asking a canvas to do something ─────────────────────────────────────────
//
// "Everything in view" belongs with the graph's other settings, in the
// layout panel — and that panel is in the toolbar, nowhere near the canvas
// and holding none of what framing needs (where the pages are, how big the
// canvas is). So the panel asks, by view, and whichever canvas is showing
// that view answers. The same way a view's camera is kept here: by view id,
// for as long as the tab is open.

export type GraphRequest = "fit" | "open" | "zoomIn" | "zoomOut";

const listeners = new Map<string, Set<() => void>>();
const key = (viewId: ID, what: GraphRequest) => `${what}:${viewId}`;

/** A canvas, saying it is the one showing this view. */
export function onGraphRequest(
  viewId: ID | undefined,
  what: GraphRequest,
  run: () => void,
): () => void {
  if (!viewId) return () => {};
  const k = key(viewId, what);
  const forView = listeners.get(k) ?? new Set();
  forView.add(run);
  listeners.set(k, forView);
  return () => {
    forView.delete(run);
    if (forView.size === 0) listeners.delete(k);
  };
}

/** Ask whichever canvas is showing this view. */
export function requestGraph(viewId: ID | undefined, what: GraphRequest): void {
  if (!viewId) return;
  for (const run of listeners.get(key(viewId, what)) ?? []) run();
}

/** Everything in view, on whichever canvas is showing this view. */
export const onFitRequest = (viewId: ID | undefined, fit: () => void) =>
  onGraphRequest(viewId, "fit", fit);
export const requestFit = (viewId: ID | undefined) =>
  requestGraph(viewId, "fit");
