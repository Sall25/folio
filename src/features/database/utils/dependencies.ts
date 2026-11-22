import type {
  DatabaseProperty,
  DependenciesSettings,
  ID,
  Page,
} from "src/types";
import { relationRecordIds } from "src/lib/relation-ids";

// Dependencies: a record that blocks another. Built the way sub-items are
// (utils/sub-items.ts) — a relation of the database with itself, made as a
// pair: the "Blocking" side is stored (what this record holds up) and
// marked `dependency`; the "Blocked by" side is its mirror, worked out from
// everyone's Blocking. Nothing else is special: they are relation
// properties, renamable, and rollups / filters work on them.
//
// This file turns those links into what a timeline draws — an edge per
// link, and the curve from one bar to the next — and refuses the one thing
// the model cannot hold: a record that ends up blocking itself.

export interface DependencyPair {
  /** The stored side: what this record is holding up. */
  blocking: DatabaseProperty;
  /** The derived side, when there is one. */
  blockedBy: DatabaseProperty | null;
}

export const DEFAULT_DEPENDENCIES: Required<DependenciesSettings> = {
  hidden: false,
  shift: "overlap",
  avoidWeekends: true,
};

/** The database's dependency pair, if it has one. */
export function dependencyPair(
  properties: DatabaseProperty[],
  sourceId: ID | null | undefined,
): DependencyPair | null {
  const blocking = properties.find(
    (p) =>
      p.config.type === "relation" &&
      p.config.dependency === true &&
      (!sourceId || p.config.targetSourceId === sourceId),
  );
  if (!blocking || blocking.config.type !== "relation") return null;
  const mirrorId = blocking.config.mirrorPropertyId;
  const blockedBy = mirrorId
    ? (properties.find((p) => p.id === mirrorId) ?? null)
    : null;
  return { blocking, blockedBy };
}

/** What a record is holding up (the links it stores). */
export function blockingIdsOf(row: Page, blockingPropId: ID): ID[] {
  return relationRecordIds(row.values?.[blockingPropId]);
}

export interface DependencyEdge {
  /** The record that blocks. */
  from: ID;
  /** The record waiting on it. */
  to: ID;
  /** The one waiting starts before this one ends (linkConflict). */
  conflict?: boolean;
}

/**
 * Every link among the rows given, in their order.
 *
 * Only between rows that are here: a link to a record this view filtered
 * out, or to one deleted since, has nothing to draw an arrow between. A
 * record linked to itself is dropped too — an arrow from a bar to itself
 * says nothing, and the link should never have been made.
 */
export function dependencyEdges(
  rows: Page[],
  blockingPropId: ID,
): DependencyEdge[] {
  const here = new Set(rows.map((r) => r.id));
  const edges: DependencyEdge[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const to of blockingIdsOf(row, blockingPropId)) {
      if (to === row.id || !here.has(to)) continue;
      const key = `${row.id}>${to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: row.id, to });
    }
  }
  return edges;
}

/**
 * Whether linking `from` → `to` would close a loop: a record that, through
 * however many links, ends up waiting on itself. Nothing could ever start,
 * and an automatic shift would chase its own tail for ever.
 */
export function wouldCycle(edges: DependencyEdge[], from: ID, to: ID): boolean {
  if (from === to) return true;
  const next = new Map<ID, ID[]>();
  for (const e of edges) {
    const list = next.get(e.from);
    if (list) list.push(e.to);
    else next.set(e.from, [e.to]);
  }
  // Can `from` already be reached from `to`? Then to → … → from, and the
  // new link would close the ring.
  const stack = [to];
  const seen = new Set<ID>();
  while (stack.length) {
    const at = stack.pop()!;
    if (at === from) return true;
    if (seen.has(at)) continue;
    seen.add(at);
    for (const n of next.get(at) ?? []) stack.push(n);
  }
  return false;
}

/**
 * Whether a link can be made from one record to another.
 *
 * Not to itself, not one that is already there, and not one that would
 * close a loop. `blocking` is every record's stored links — the whole of
 * them, including links to records this view is not showing, because a
 * loop can run through one.
 */
export function canLink(blocking: Record<ID, ID[]>, from: ID, to: ID): boolean {
  if (!from || !to || from === to) return false;
  if ((blocking[from] ?? []).includes(to)) return false;
  const edges: DependencyEdge[] = [];
  for (const [at, tos] of Object.entries(blocking))
    for (const t of tos) edges.push({ from: at, to: t });
  return !wouldCycle(edges, from, to);
}

/** What a conflict is read from: the dates a bar covers. */
export interface LinkedDates {
  start: Date | null;
  end: Date | null;
  /** A date with no time of day covers its whole last day. */
  allDay: boolean;
}

/**
 * Whether a link is in trouble: the record waiting starts before the one
 * blocking it has finished, so the two run side by side and the thing that
 * is meant to come first does not.
 *
 * Read from the dates and not from the bars. Two bars can touch on screen
 * without their dates meeting — a date in a year view is six pixels wide
 * and is drawn wider than that so it can be seen at all — and a line drawn
 * red is the view saying something is wrong with the plan, which had
 * better be true of the plan rather than of the zoom.
 */
export function linkConflict(
  blocker: LinkedDates | undefined,
  blocked: LinkedDates | undefined,
): boolean {
  if (!blocker?.start || !blocked?.start) return false;
  const over = new Date(blocker.end ?? blocker.start);
  if (blocker.allDay) {
    // Through the end of its last day: a record dated to the 9th is busy
    // all of the 9th, so one starting that day overlaps it.
    over.setHours(0, 0, 0, 0);
    over.setDate(over.getDate() + 1);
  }
  return blocked.start.getTime() < over.getTime();
}

/** Where an arrow leaves one bar and meets the next, in the grid's pixels. */
export interface LinkPoint {
  x: number;
  y: number;
}

/** How far an arrow stands off a bar it loops around. */
const LOOP_OUT = 18;

/**
 * The curve from the end of one bar to the start of the next.
 *
 * Forwards — the usual way round — it is a single bezier, leaving the right
 * edge horizontally and arriving at the left edge the same way, so it reads
 * as a line between two bars rather than a line across the chart.
 *
 * A record can also be dated before the thing blocking it ends, which is
 * exactly what the arrow is there to show. The curve then leaves to the
 * right, turns back through the space between the two rows, and comes into
 * the left edge from the left — never through the bars themselves.
 */
export function linkPath(a: LinkPoint, b: LinkPoint): string {
  const forward = b.x - a.x;
  if (forward >= LOOP_OUT) {
    const pull = Math.max(forward * 0.5, 22);
    return `M ${r(a.x)} ${r(a.y)} C ${r(a.x + pull)} ${r(a.y)}, ${r(b.x - pull)} ${r(b.y)}, ${r(b.x)} ${r(b.y)}`;
  }
  const out = a.x + LOOP_OUT;
  const back = b.x - LOOP_OUT;
  const mid = (a.y + b.y) / 2;
  return (
    `M ${r(a.x)} ${r(a.y)} ` +
    `C ${r(out + 20)} ${r(a.y)}, ${r(out + 20)} ${r(mid)}, ${r((out + back) / 2)} ${r(mid)} ` +
    `C ${r(back - 20)} ${r(mid)}, ${r(back - 20)} ${r(b.y)}, ${r(b.x)} ${r(b.y)}`
  );
}

/** Two decimals is a tenth of a pixel on a retina screen, and keeps a
 *  thousand paths from carrying seventeen digits each. */
function r(n: number): number {
  return Math.round(n * 100) / 100;
}
