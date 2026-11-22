import type { GraphPoint } from "./graph-layout";

// Where the view is looking, and the sums that go with it.
//
// Kept apart from the component because it is arithmetic, not React: a box
// on screen, a viewBox, and a camera over the graph's own coordinates.

export interface Camera {
  /** The middle of the view, in the graph's own coordinates. */
  x: number;
  y: number;
  zoom: number;
}

export const START_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

export interface Box {
  width: number;
  height: number;
}

/**
 * How many screen pixels one unit of the box is worth, in an element of
 * this size: the browser fits the whole viewBox inside the element and
 * centres what is left over, so both axes share one scale.
 */
export function viewScale(
  rect: { width: number; height: number },
  box: Box,
): number {
  if (!rect.width || !rect.height) return 0;
  return Math.min(rect.width / box.width, rect.height / box.height);
}

/** A point on screen, in the graph's own coordinates. */
export function graphPointIn(
  rect: { left: number; top: number; width: number; height: number },
  box: Box,
  camera: Camera,
  at: { clientX: number; clientY: number },
): GraphPoint {
  const scale = viewScale(rect, box);
  if (!scale) return { x: camera.x, y: camera.y };
  // Through the element, past whatever the browser left over at the sides,
  // then back out of the camera: the drawing is scaled about the middle of
  // the box and shifted by it.
  const x =
    (at.clientX - rect.left - (rect.width - box.width * scale) / 2) / scale;
  const y =
    (at.clientY - rect.top - (rect.height - box.height * scale) / 2) / scale;
  return {
    x: (x - box.width / 2) / camera.zoom + camera.x + box.width / 2,
    y: (y - box.height / 2) / camera.zoom + camera.y + box.height / 2,
  };
}

/** The camera moved by a drag of the background, in screen pixels. */
export function pannedBy(
  camera: Camera,
  box: Box,
  rect: { width: number; height: number },
  dx: number,
  dy: number,
): Camera {
  const scale = viewScale(rect, box) || 1;
  return {
    ...camera,
    x: camera.x - dx / (scale * camera.zoom),
    y: camera.y - dy / (scale * camera.zoom),
  };
}

/**
 * Zoomed about a point, so whatever is under the pointer stays under it —
 * the thing that tells a canvas from a picture that changes size.
 */
export function zoomedAbout(
  camera: Camera,
  box: Box,
  at: GraphPoint,
  factor: number,
): Camera {
  const zoom = clamp(camera.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  if (zoom === camera.zoom) return camera;
  const k = 1 / camera.zoom - 1 / zoom;
  return {
    zoom,
    x: camera.x + (at.x - camera.x - box.width / 2) * k * camera.zoom,
    y: camera.y + (at.y - camera.y - box.height / 2) * k * camera.zoom,
  };
}

/**
 * The piece of the graph's own coordinates the view is looking at, with
 * room around it.
 *
 * This is what the ground is drawn on. Drawing it in the graph's
 * coordinates rather than the element's is the whole trick of a canvas: the
 * dots and the grid then pan and scale with everything standing on them,
 * because they are part of the surface and not a picture laid over it.
 */
export function visibleRect(
  camera: Camera,
  box: Box,
  overscan = 2,
): { x: number; y: number; width: number; height: number } {
  // Square, from the longer side: the element the canvas is drawn in is not
  // always the shape of the box — a short one shows more to the sides than
  // the box holds — and ground that stopped short of the edge would be a
  // visible seam.
  const side = (Math.max(box.width, box.height) / camera.zoom) * overscan;
  const width = side;
  const height = side;
  return {
    x: box.width / 2 + camera.x - width / 2,
    y: box.height / 2 + camera.y - height / 2,
    width,
    height,
  };
}

/**
 * A camera that holds all of these points, with room around the edges for
 * the labels under them.
 *
 * Never magnified past `maxZoom`: two pages joined by one link, blown up to
 * fill a screen, look like a mistake rather than two pages.
 */
export function frameAround(
  points: Iterable<GraphPoint>,
  box: Box,
  { padding = 90, maxZoom = 1.6 }: { padding?: number; maxZoom?: number } = {},
): Camera {
  const all = [...points];
  if (all.length === 0) return START_CAMERA;
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const zoom = clamp(
    Math.min(
      (box.width - padding * 2) / Math.max(maxX - minX, 1),
      (box.height - padding * 2) / Math.max(maxY - minY, 1),
      maxZoom,
    ),
    MIN_ZOOM,
    MAX_ZOOM,
  );
  return {
    zoom,
    x: (minX + maxX) / 2 - box.width / 2,
    y: (minY + maxY) / 2 - box.height / 2,
  };
}

/** The transform the whole drawing hangs from. */
export function cameraTransform(camera: Camera, box: Box): string {
  return (
    `translate(${box.width / 2} ${box.height / 2}) ` +
    `scale(${camera.zoom}) ` +
    `translate(${-box.width / 2 - camera.x} ${-box.height / 2 - camera.y})`
  );
}

export const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);
