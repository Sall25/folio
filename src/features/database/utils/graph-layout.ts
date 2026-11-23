import type { ID } from "src/types";
import type { GraphEdge, GraphNode } from "./graph-model";

// Where the nodes go.
//
// A force layout, written out rather than brought in: repulsion between
// every pair of nodes, a spring along every edge, and a gentle pull to the
// middle so nothing drifts off. It is a few dozen lines, it has no
// dependency, and — the part a library would not give — it is *seeded*, so
// the same records settle in the same places every time the view is opened
// instead of rearranging themselves under the person each time.

export interface GraphPoint {
  x: number;
  y: number;
}

export interface LayoutOptions {
  width: number;
  height: number;
  /** How long to let it settle. Fewer for a graph being dragged. */
  steps?: number;
  /** Nodes the person put somewhere: held there, and pulled on by others. */
  pinned?: Record<ID, GraphPoint>;
  /** What each node is grouped by — the value it takes its colour from.
   *  Given, nodes sharing a value are drawn towards one another, so the
   *  colours gather into places instead of being sprinkled through the
   *  same web. Left out, nothing gathers. */
  groups?: Map<ID, string | null>;
}

/** How far apart two joined nodes would like to be. */
const SPRING = 150;
/** How hard every node pushes every other away. */
const PUSH = 9000;
/** How strongly the middle pulls, so a loose piece does not wander off. */
const GRAVITY = 0.004;
const FRICTION = 0.82;
/** How strongly a node is drawn towards the middle of its own group. Well
 *  under the spring, so what a page is joined to still decides where it
 *  sits and its colour only leans on that. */
const GROUP_PULL = 0.012;

/**
 * Lay the graph out. The same nodes and edges always give the same
 * positions: the starting ring is worked out from each node's place in the
 * list, and nothing here reads the clock or Math.random.
 */
export function layoutGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  { width, height, steps = 320, pinned = {}, groups }: LayoutOptions,
): Map<ID, GraphPoint> {
  const at = new Map<ID, GraphPoint & { vx: number; vy: number }>();
  const mid = { x: width / 2, y: height / 2 };

  nodes.forEach((node, i) => {
    const held = pinned[node.id];
    if (held) {
      at.set(node.id, { ...held, vx: 0, vy: 0 });
      return;
    }
    // A ring, spread by the node's own place in it: close enough to be
    // pulled into shape, far enough apart not to start on top of itself.
    const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
    const radius = 120 + ((i * 37) % 160);
    at.set(node.id, {
      x: mid.x + Math.cos(angle) * radius,
      y: mid.y + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    });
  });

  for (let step = 0; step < steps; step++) {
    // Big moves early, small ones late, so it comes to rest.
    const cool = 1 - step / steps;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = at.get(nodes[i].id)!;
        const b = at.get(nodes[j].id)!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) {
          // Exactly on top of each other: nudge them apart deterministically
          // rather than dividing by nothing.
          dx = 0.5 + (i % 3) * 0.1;
          dy = 0.5 + (j % 3) * 0.1;
          d2 = dx * dx + dy * dy;
        }
        const d = Math.sqrt(d2);
        const force = PUSH / d2;
        a.vx -= (dx / d) * force;
        a.vy -= (dy / d) * force;
        b.vx += (dx / d) * force;
        b.vy += (dy / d) * force;
      }
    }

    for (const edge of edges) {
      const a = at.get(edge.from);
      const b = at.get(edge.to);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = (d - SPRING) * 0.02;
      a.vx += (dx / d) * force;
      a.vy += (dy / d) * force;
      b.vx -= (dx / d) * force;
      b.vy -= (dy / d) * force;
    }

    // Each group towards its own middle, worked out where it stands now.
    // Nodes with no value of their own are left out of it: "nothing here"
    // is not a group, and gathering them would make one.
    if (groups?.size) {
      const middles = new Map<string, { x: number; y: number; n: number }>();
      for (const node of nodes) {
        const group = groups.get(node.id);
        if (!group) continue;
        const p = at.get(node.id)!;
        const sum = middles.get(group) ?? { x: 0, y: 0, n: 0 };
        sum.x += p.x;
        sum.y += p.y;
        sum.n += 1;
        middles.set(group, sum);
      }
      for (const node of nodes) {
        const group = groups.get(node.id);
        const sum = group ? middles.get(group) : undefined;
        if (!sum) continue;
        const p = at.get(node.id)!;
        p.vx += (sum.x / sum.n - p.x) * GROUP_PULL;
        p.vy += (sum.y / sum.n - p.y) * GROUP_PULL;
      }
    }

    for (const node of nodes) {
      if (pinned[node.id]) continue; // held where it was put
      const p = at.get(node.id)!;
      p.vx += (mid.x - p.x) * GRAVITY;
      p.vy += (mid.y - p.y) * GRAVITY;
      p.vx *= FRICTION;
      p.vy *= FRICTION;
      p.x += p.vx * cool;
      p.y += p.vy * cool;
    }
  }

  const out = new Map<ID, GraphPoint>();
  for (const [id, p] of at) out.set(id, { x: round(p.x), y: round(p.y) });
  return out;
}

/**
 * Move and scale what settled so all of it is inside the box, with room
 * around the edges for the labels under the nodes.
 *
 * Never magnified past `maxScale`: three records joined in a line, blown up
 * to fill a screen, look like a mistake rather than three records.
 */
export function fitIntoView(
  points: Map<ID, GraphPoint>,
  {
    width,
    height,
    padding = 56,
    maxScale = 1.4,
  }: { width: number; height: number; padding?: number; maxScale?: number },
): { scale: number; at: Map<ID, GraphPoint> } {
  if (points.size === 0) return { scale: 1, at: points };
  const xs = [...points.values()].map((p) => p.x);
  const ys = [...points.values()].map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = Math.min(
    (width - padding * 2) / Math.max(maxX - minX, 1),
    (height - padding * 2) / Math.max(maxY - minY, 1),
    maxScale,
  );
  const at = new Map<ID, GraphPoint>();
  for (const [id, p] of points) {
    at.set(id, {
      x: round((p.x - (minX + maxX) / 2) * scale + width / 2),
      y: round((p.y - (minY + maxY) / 2) * scale + height / 2),
    });
  }
  return { scale, at };
}

/**
 * A node's size: more links, bigger, but not without end — and never
 * smaller than a page's cover needs to be recognisable, which is the whole
 * point of showing one.
 */
export function nodeRadius(degree: number): number {
  return 20 + Math.min(degree, 6) * 2;
}

const round = (n: number) => Math.round(n * 100) / 100;
