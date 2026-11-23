import type { ID } from "src/types";

// What the canvas is paying attention to.
//
// A graph of any size is mostly pages you are not thinking about. These are
// the four questions the drawing asks about each one — how far away is it,
// is it on the way between these two, does it answer what was typed, and
// how long since anyone touched it — and each is arithmetic over the model,
// so it can be checked without a browser.

/**
 * How many links away every page is from one of them.
 *
 * The page itself is 0, its own are 1, theirs are 2. A page nothing joins
 * to it is not in the map at all, which is the honest answer: not "far", but
 * "not reachable from here".
 */
export function hopsFrom(
  neighbours: Map<ID, Set<ID>>,
  from: ID,
): Map<ID, number> {
  const out = new Map<ID, number>();
  if (!from) return out;
  out.set(from, 0);
  // Breadth first, so the first time a page is reached is by its shortest
  // route and it is never written twice.
  let edge: ID[] = [from];
  let depth = 0;
  while (edge.length) {
    depth += 1;
    const next: ID[] = [];
    for (const at of edge) {
      for (const near of neighbours.get(at) ?? []) {
        if (out.has(near)) continue;
        out.set(near, depth);
        next.push(near);
      }
    }
    edge = next;
  }
  return out;
}

/**
 * The shortest chain of pages joining two of them, both ends included.
 *
 * Empty when nothing joins them — which is a real answer about a graph and
 * is worth saying out loud rather than drawing nothing and leaving the
 * question open.
 */
export function chainBetween(
  neighbours: Map<ID, Set<ID>>,
  from: ID,
  to: ID,
): ID[] {
  if (!from || !to) return [];
  if (from === to) return [from];
  // Where each page was first reached from, which is the chain read
  // backwards once the far end is found.
  const cameFrom = new Map<ID, ID | null>([[from, null]]);
  let edge: ID[] = [from];
  while (edge.length) {
    const next: ID[] = [];
    for (const at of edge) {
      for (const near of neighbours.get(at) ?? []) {
        if (cameFrom.has(near)) continue;
        cameFrom.set(near, at);
        if (near === to) {
          const chain: ID[] = [];
          let step: ID | null | undefined = to;
          while (step) {
            chain.unshift(step);
            step = cameFrom.get(step);
          }
          return chain;
        }
        next.push(near);
      }
    }
    edge = next;
  }
  return [];
}

/**
 * The pages whose title answers what was typed.
 *
 * Accents are ignored on both sides, so "resume" finds "Résumé" and
 * "etude" finds "Étude" — on a French keyboard the accent is easy to type
 * and on anyone else's it is a reason the search fails for no good reason.
 * An empty query matches nothing rather than everything: nothing typed is
 * not a search, and lighting the whole canvas would say otherwise.
 */
export function matching(
  nodes: { id: ID; title: string }[],
  query: string,
): Set<ID> {
  const wanted = plain(query);
  if (!wanted) return new Set();
  const out = new Set<ID>();
  for (const node of nodes) {
    if (plain(node.title).includes(wanted)) out.add(node.id);
  }
  return out;
}

const plain = (text: string) =>
  text
    .normalize("NFD")
    // Combining marks: é becomes e, ü becomes u.
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

/** Past this many days without an edit, a page is as faint as it gets. */
export const STALE_DAYS = 60;
/** How solid the oldest page on the canvas is still drawn. */
export const FAINTEST = 0.38;
const DAY = 24 * 60 * 60 * 1000;

/**
 * How solid a page is drawn, by how long since it was last edited: 1 today,
 * fading to `FAINTEST` at `STALE_DAYS` and no fainter after that.
 *
 * A page with no edit recorded is drawn in full. Never edited is not the
 * same as long ago, and a page the canvas knows nothing about should not be
 * the faintest thing on it.
 */
export function ageFade(
  updatedAt: number | null | undefined,
  now: number,
): number {
  if (updatedAt == null) return 1;
  const days = (now - updatedAt) / DAY;
  // A clock that disagrees — a page edited "tomorrow" — is today's page.
  if (!Number.isFinite(days) || days <= 0) return 1;
  if (days >= STALE_DAYS) return FAINTEST;
  return 1 - (days / STALE_DAYS) * (1 - FAINTEST);
}
