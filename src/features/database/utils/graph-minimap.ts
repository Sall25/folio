import type { ID } from "src/types";
import type { Box, Camera } from "./graph-camera";
import type { GraphPoint } from "./graph-layout";

// The small map in the corner: the whole graph at a glance, and a frame
// showing the piece of it the canvas is looking at.
//
// A canvas you can pan forever is a canvas you can get lost on. The map is
// the way back: everything fits in it, so whatever is missing from the view
// is still somewhere in that little box, and clicking it goes there.
//
// Arithmetic only — one mapping, used three ways: to place the dots, to
// draw the frame, and to read a click back into the graph's coordinates.

export interface MinimapFit {
  /** Graph units to map units. */
  scale: number;
  /** Where the graph's own origin lands on the map. */
  dx: number;
  dy: number;
}

/**
 * Fit everything into a map of this size, with the view's own box always
 * part of what is fitted — so the frame cannot wander off the map when the
 * canvas is looking somewhere empty.
 */
export function minimapFit(
  points: Iterable<GraphPoint>,
  box: Box,
  size: Box,
  camera: Camera = { x: 0, y: 0, zoom: 1 },
  padding = 6,
): MinimapFit {
  const seen = [...points, ...cornersOf(camera, box)];
  const xs = seen.map((p) => p.x);
  const ys = seen.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = Math.min(
    (size.width - padding * 2) / Math.max(maxX - minX, 1),
    (size.height - padding * 2) / Math.max(maxY - minY, 1),
  );
  return {
    scale,
    dx:
      padding -
      minX * scale +
      (size.width - padding * 2 - (maxX - minX) * scale) / 2,
    dy:
      padding -
      minY * scale +
      (size.height - padding * 2 - (maxY - minY) * scale) / 2,
  };
}

/** A graph point, on the map. */
export function onMinimap(fit: MinimapFit, at: GraphPoint): GraphPoint {
  return { x: at.x * fit.scale + fit.dx, y: at.y * fit.scale + fit.dy };
}

/** A point on the map, back in the graph's own coordinates. */
export function fromMinimap(fit: MinimapFit, at: GraphPoint): GraphPoint {
  if (!fit.scale) return { x: 0, y: 0 };
  return { x: (at.x - fit.dx) / fit.scale, y: (at.y - fit.dy) / fit.scale };
}

/** The frame: what the canvas is looking at, drawn on the map. */
export function minimapViewport(
  fit: MinimapFit,
  camera: Camera,
  box: Box,
): { x: number; y: number; width: number; height: number } {
  const [topLeft] = cornersOf(camera, box);
  const at = onMinimap(fit, topLeft);
  return {
    x: at.x,
    y: at.y,
    width: (box.width / camera.zoom) * fit.scale,
    height: (box.height / camera.zoom) * fit.scale,
  };
}

/** Where a node with the most links is, for a list to jump to. */
export function busiest<T extends { id: ID; degree: number }>(
  nodes: T[],
  howMany = 5,
): T[] {
  return [...nodes]
    .filter((n) => n.degree > 0)
    .sort((a, b) => b.degree - a.degree)
    .slice(0, howMany);
}

/** The two corners of what the camera sees, in the graph's coordinates. */
function cornersOf(camera: Camera, box: Box): [GraphPoint, GraphPoint] {
  const width = box.width / camera.zoom;
  const height = box.height / camera.zoom;
  const midX = box.width / 2 + camera.x;
  const midY = box.height / 2 + camera.y;
  return [
    { x: midX - width / 2, y: midY - height / 2 },
    { x: midX + width / 2, y: midY + height / 2 },
  ];
}
