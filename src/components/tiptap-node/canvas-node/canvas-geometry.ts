// The canvas's arithmetic, kept apart from React and ProseMirror so it can be
// read and tested on its own: where an edge leaves a block, how it curves,
// which side a pointer is nearest, and how the viewport moves under a zoom.
//
// Two coordinate spaces, and mixing them up is the bug to watch for:
//   · canvas space — where blocks live (canvasX / canvasY attributes),
//     unaffected by panning or zooming.
//   · screen space — what the pointer reports.
// `toCanvas` is the only crossing between them.

export type Side = "top" | "right" | "bottom" | "left";

export interface Point {
  x: number;
  y: number;
}

/** A block on the canvas: its position (from attributes) and measured size. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** How the canvas is panned and zoomed. Local to one reader, never shared. */
export interface Viewport {
  x: number;
  y: number;
  k: number;
}

export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 2;
/** Blocks land on this grid, so a hand-dragged row still lines up. */
export const GRID = 8;

export const SIDES: Side[] = ["top", "right", "bottom", "left"];

export function clampZoom(k: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));
}

export function snap(n: number, grid: number = GRID): number {
  return Math.round(n / grid) * grid;
}

/** Where an edge meets a block, on the given side. */
export function anchor(r: Rect, side: Side): Point {
  switch (side) {
    case "left":
      return { x: r.x, y: r.y + r.h / 2 };
    case "right":
      return { x: r.x + r.w, y: r.y + r.h / 2 };
    case "top":
      return { x: r.x + r.w / 2, y: r.y };
    default:
      return { x: r.x + r.w / 2, y: r.y + r.h };
  }
}

export function oppositeSide(side: Side): Side {
  if (side === "left") return "right";
  if (side === "right") return "left";
  if (side === "top") return "bottom";
  return "top";
}

/**
 * Which side of a block a point is nearest, measured in widths and heights
 * rather than pixels: on a wide, short block the top and bottom still win
 * their own share of the area.
 */
export function nearestSide(r: Rect, p: Point): Side {
  const dx = r.w ? (p.x - (r.x + r.w / 2)) / r.w : 0;
  const dy = r.h ? (p.y - (r.y + r.h / 2)) / r.h : 0;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "bottom" : "top";
}

/** The control point that makes an edge leave its block perpendicular. */
function control(p: Point, side: Side, d: number): Point {
  switch (side) {
    case "left":
      return { x: p.x - d, y: p.y };
    case "right":
      return { x: p.x + d, y: p.y };
    case "top":
      return { x: p.x, y: p.y - d };
    default:
      return { x: p.x, y: p.y + d };
  }
}

function bend(a: Point, b: Point): number {
  return Math.max(45, Math.hypot(b.x - a.x, b.y - a.y) * 0.38);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function curve(a: Point, aSide: Side, b: Point, bSide: Side): string {
  const d = bend(a, b);
  const c1 = control(a, aSide, d);
  const c2 = control(b, bSide, d);
  return (
    `M${round(a.x)},${round(a.y)} ` +
    `C${round(c1.x)},${round(c1.y)} ${round(c2.x)},${round(c2.y)} ` +
    `${round(b.x)},${round(b.y)}`
  );
}

/** The path of an edge between two blocks, in canvas space. */
export function edgePath(a: Rect, aSide: Side, b: Rect, bSide: Side): string {
  return curve(anchor(a, aSide), aSide, anchor(b, bSide), bSide);
}

/**
 * The middle of an edge, for the label and the remove button. A cubic at
 * t = 0.5 is (P0 + 3·C1 + 3·C2 + P3) / 8, so no DOM is needed to find it.
 */
export function edgeMidpoint(
  a: Rect,
  aSide: Side,
  b: Rect,
  bSide: Side,
): Point {
  const p0 = anchor(a, aSide);
  const p3 = anchor(b, bSide);
  const d = bend(p0, p3);
  const c1 = control(p0, aSide, d);
  const c2 = control(p3, bSide, d);
  return {
    x: (p0.x + 3 * c1.x + 3 * c2.x + p3.x) / 8,
    y: (p0.y + 3 * c1.y + 3 * c2.y + p3.y) / 8,
  };
}

/** The path of an edge still being drawn, from a block to the pointer. */
export function draftPath(a: Rect, aSide: Side, to: Point): string {
  return curve(anchor(a, aSide), aSide, to, oppositeSide(aSide));
}

/** A screen point (client coordinates) in canvas space. */
export function toCanvas(
  client: Point,
  frame: { left: number; top: number },
  v: Viewport,
): Point {
  return {
    x: (client.x - frame.left - v.x) / v.k,
    y: (client.y - frame.top - v.y) / v.k,
  };
}

/** Zoom by `factor`, keeping the canvas point under `at` (a point inside the
 *  frame) where it is. */
export function zoomAt(v: Viewport, at: Point, factor: number): Viewport {
  const k = clampZoom(v.k * factor);
  if (k === v.k) return v;
  return {
    k,
    x: at.x - (at.x - v.x) * (k / v.k),
    y: at.y - (at.y - v.y) * (k / v.k),
  };
}

/** The box around every block, or a unit box when there are none. */
export function boundsOf(rects: Rect[]): Rect {
  if (rects.length === 0) return { x: 0, y: 0, w: 1, h: 1 };
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const r of rects) {
    x1 = Math.min(x1, r.x);
    y1 = Math.min(y1, r.y);
    x2 = Math.max(x2, r.x + r.w);
    y2 = Math.max(y2, r.y + r.h);
  }
  return { x: x1, y: y1, w: Math.max(1, x2 - x1), h: Math.max(1, y2 - y1) };
}

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * The viewport that shows every block at once. The padding is uneven because
 * the toolbars float over the canvas: without it a block lands underneath one.
 */
export function fitView(
  rects: Rect[],
  frame: { w: number; h: number },
  pad: Padding,
): Viewport {
  const b = boundsOf(rects);
  const w = Math.max(80, frame.w - pad.left - pad.right);
  const h = Math.max(80, frame.h - pad.top - pad.bottom);
  const k = clampZoom(Math.min(w / b.w, h / b.h, 1));
  return {
    k,
    x: pad.left + (w - b.w * k) / 2 - b.x * k,
    y: pad.top + (h - b.h * k) / 2 - b.y * k,
  };
}

/**
 * Where to drop a block that arrives without a position — pasted, dragged in,
 * or made before the canvas knew about it. Blocks cascade down and right from
 * the top left rather than stacking on one another.
 */
export function placeNew(taken: Rect[], width: number, step = 32): Point {
  const start = { x: GRID * 4, y: GRID * 4 };
  for (let i = 0; i < 200; i += 1) {
    const p = { x: start.x + i * step, y: start.y + i * step };
    const clash = taken.some(
      (r) => Math.abs(r.x - p.x) < width / 2 && Math.abs(r.y - p.y) < step,
    );
    if (!clash) return p;
  }
  return start;
}
