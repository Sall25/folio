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
