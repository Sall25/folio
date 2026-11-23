import type { ID } from "src/types";
import type { GraphPoint } from "./graph-layout";

// The shape of a connection.
//
// A straight line from centre to centre is the obvious drawing and the worst
// one: it runs under both pages, so every node looks skewered, and two pages
// joined twice draw the same line twice. A connection here is an arc that
// stops clear of both rims, and parallel ones fan apart so each can be seen
// and hovered on its own.
//
// Arithmetic only, so the drawing can be checked without a browser.

export interface EdgeEnd {
  at: GraphPoint;
  /** The node's radius: where the line has to stop. */
  r: number;
}

export interface EdgeShape {
  /** The arc itself, clear of both rims. */
  d: string;
  /** The straight line between the two centres, which is what a gradient
   *  along the connection is measured against — so the colours stay put
   *  while the arc bends away from it. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Where a label or a button on this connection belongs. */
  mid: GraphPoint;
}

/** How far each of several links between the same two pages bends aside, so
 *  they fan instead of lying on top of one another. */
export function bendOffsets(count: number, spread = 0.13): number[] {
  if (count <= 1) return [0];
  const first = -(spread * (count - 1)) / 2;
  return Array.from({ length: count }, (_, i) => first + spread * i);
}

/** The two pages a connection joins, whichever way round it was written:
 *  one key, so parallel links can be counted and fanned together. */
export function pairKey(from: ID, to: ID): string {
  return from < to ? `${from}|${to}` : `${to}|${from}`;
}

/**
 * One connection, as an arc between two pages.
 *
 * `bend` pushes the middle sideways, as a fraction of the distance between
 * them: 0 is straight, positive bends one way and negative the other. The
 * ends are pulled back by each page's radius and a little more, so the line
 * reaches the rim and stops rather than disappearing under the page.
 */
export function edgeShape(
  a: EdgeEnd,
  b: EdgeEnd,
  bend = 0,
  gap = 4,
): EdgeShape {
  const dx = b.at.x - a.at.x;
  const dy = b.at.y - a.at.y;
  const len = Math.hypot(dx, dy);
  // Two pages in the same place: nothing to draw between them, but it must
  // still be a path rather than NaNs.
  if (len < 0.001) {
    const d = `M${a.at.x} ${a.at.y} L${a.at.x} ${a.at.y}`;
    return { d, x1: a.at.x, y1: a.at.y, x2: b.at.x, y2: b.at.y, mid: a.at };
  }
  const ux = dx / len;
  const uy = dy / len;
  // Never pull back past the other end: two big pages close together would
  // otherwise draw a line running backwards.
  const room = Math.max(len - 2, 0);
  const inA = Math.min(a.r + gap, room);
  const inB = Math.min(b.r + gap, Math.max(room - inA, 0));
  const x1 = a.at.x + ux * inA;
  const y1 = a.at.y + uy * inA;
  const x2 = b.at.x - ux * inB;
  const y2 = b.at.y - uy * inB;
  // The control point: the middle, pushed along the normal.
  const cx = (x1 + x2) / 2 - (y2 - y1) * bend;
  const cy = (y1 + y2) / 2 + (x2 - x1) * bend;
  return {
    d: `M${round(x1)} ${round(y1)} Q${round(cx)} ${round(cy)} ${round(x2)} ${round(y2)}`,
    x1: a.at.x,
    y1: a.at.y,
    x2: b.at.x,
    y2: b.at.y,
    // A point on the curve at its middle, not the control point, which is
    // twice as far out.
    mid: {
      x: round((x1 + 2 * cx + x2) / 4),
      y: round((y1 + 2 * cy + y2) / 4),
    },
  };
}

const round = (n: number) => Math.round(n * 100) / 100;
