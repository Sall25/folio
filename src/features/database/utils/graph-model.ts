import type { DatabaseProperty, GraphView, ID, Page } from "src/types";
import { relationRecordIds } from "src/lib/relation-ids";
import { firstImageSrc } from "./first-image";
import { pageLinkIds } from "./page-links";

// What a graph view draws, worked out from the records it is given.
//
// Folio does not have to guess at structure the way a notes app does: a
// relation property IS the link, typed and named. So the nodes are the
// records this view shows and the edges are their relations — each edge
// knowing which property it came from, so the view can draw a sub-item
// differently from a dependency, and say which is which.

export interface GraphNode {
  id: ID;
  title: string;
  /** The page's cover, or the first image in it: what makes a node that
   *  page rather than a dot. */
  image: string | null;
  /** Its icon, when it has no picture to show. */
  icon: string | null;
  /** False for a record pulled in from another database by a relation. */
  own: boolean;
  /** Which database it belongs to, for the ones that are not this one. */
  sourceId: ID | null;
  /** The value its colour comes from, if the view colours by a property. */
  colorKey: string | null;
  /** How many edges touch it: a node's weight in the drawing. */
  degree: number;
}

export interface GraphEdge {
  from: ID;
  to: ID;
  /** The relation property this link was read from, or null for a link
   *  written in the page itself. */
  propertyId: ID | null;
  /** How the two pages are joined: a relation property, or a link in the
   *  text of one of them. */
  kind: "relation" | "link";
}

export interface GraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Node ids by the id of each node they are joined to. */
  neighbours: Map<ID, Set<ID>>;
}

/** The relation properties a graph draws: the ones chosen, or all of them. */
export function linkProperties(
  properties: DatabaseProperty[],
  view: GraphView | undefined,
): DatabaseProperty[] {
  const relations = properties.filter(
    (p) =>
      p.config.type === "relation" &&
      // The derived side is the same links read backwards: drawing both
      // would double every edge.
      !isMirror(p),
  );
  const chosen = view?.linkPropertyIds ?? [];
  if (chosen.length === 0) return relations;
  return relations.filter((p) => chosen.includes(p.id));
}

function isMirror(p: DatabaseProperty): boolean {
  return (
    p.config.type === "relation" &&
    !!p.config.mirrorPropertyId &&
    !p.config.showOnTarget
  );
}

/**
 * The graph itself.
 *
 * `records` are the ones this view shows — already filtered, searched and
 * sorted, because a graph is a view of them and not of the database behind
 * them. `linked` is where to look up a record pointed at from somewhere
 * else: another database's row, or one of this database's that the filters
 * left out.
 *
 * A link to a record that cannot be found at all is dropped. It has no node
 * to join to, and a line that goes nowhere says only that something is
 * missing — which the record's own page says better.
 */
export function buildGraph(
  records: Page[],
  properties: DatabaseProperty[],
  view: GraphView | undefined,
  linked: (id: ID) => Page | undefined,
): GraphModel {
  const links = linkProperties(properties, view);
  const colorPropertyId = view?.colorPropertyId ?? null;
  const includeLinked = view?.includeLinked !== false;

  const nodes = new Map<ID, GraphNode>();
  const own = new Set(records.map((r) => r.id));
  for (const record of records)
    nodes.set(record.id, nodeOf(record, true, colorPropertyId));

  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    for (const property of links) {
      for (const to of relationRecordIds(record.values?.[property.id])) {
        if (to === record.id) continue;
        if (!nodes.has(to)) {
          if (!includeLinked) continue;
          const page = linked(to);
          // Deleted, or beyond what this person can see.
          if (!page) continue;
          nodes.set(to, nodeOf(page, own.has(page.id), colorPropertyId));
        }
        const key = `${record.id}>${to}>${property.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({
          from: record.id,
          to,
          propertyId: property.id,
          kind: "relation",
        });
      }
    }

    // And the links written in the page itself: a graph of pages is first
    // of all a graph of what people wrote into one another.
    for (const to of pageLinkIds(record.content)) {
      if (to === record.id) continue;
      if (!nodes.has(to)) {
        if (!includeLinked) continue;
        const page = linked(to);
        if (!page) continue;
        nodes.set(to, nodeOf(page, own.has(page.id), colorPropertyId));
      }
      const key = `${record.id}>${to}>link`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: record.id, to, propertyId: null, kind: "link" });
    }
  }

  const neighbours = new Map<ID, Set<ID>>();
  const join = (a: ID, b: ID) => {
    const set = neighbours.get(a);
    if (set) set.add(b);
    else neighbours.set(a, new Set([b]));
  };
  for (const edge of edges) {
    join(edge.from, edge.to);
    join(edge.to, edge.from);
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (from) from.degree += 1;
    if (to) to.degree += 1;
  }

  return { nodes: [...nodes.values()], edges, neighbours };
}

/**
 * Whether dragging from one node to another can make a link.
 *
 * Not to itself, and not one that is already there. A loop only matters to
 * a dependency — a record cannot wait on itself — while a plain relation is
 * free to go round and round, which is what "related to" is for.
 */
export function canConnectWith(
  property: DatabaseProperty | null,
  linksOf: (id: ID) => ID[],
  from: ID,
  to: ID,
): boolean {
  if (!property || !from || !to || from === to) return false;
  if (linksOf(from).includes(to)) return false;
  const isDependency =
    property.config.type === "relation" && !!property.config.dependency;
  if (!isDependency) return true;
  // Walk forward from the record being linked to: if it reaches the one
  // the drag started from, the link would close the ring.
  const seen = new Set<ID>();
  const stack = [to];
  while (stack.length) {
    const at = stack.pop()!;
    if (at === from) return false;
    if (seen.has(at)) continue;
    seen.add(at);
    for (const next of linksOf(at)) stack.push(next);
  }
  return true;
}

/** A page, as a node: what it is called, and what it looks like. */
function nodeOf(
  page: Page,
  own: boolean,
  colorPropertyId: ID | null,
): GraphNode {
  const cover = page.cover as unknown as
    | { coverImage?: string; gradient?: string; iconName?: string }
    | undefined;
  return {
    id: page.id,
    title: page.title ?? "",
    // Its cover, or the first picture inside it — the same order a card
    // uses, so a page looks like itself wherever it is shown.
    image: cover?.coverImage || firstImageSrc(page.content) || null,
    icon: cover?.iconName ?? null,
    own,
    sourceId: page.sourceId ?? null,
    colorKey: colorKeyOf(page, colorPropertyId),
    degree: 0,
  };
}

/** The value a node is coloured by: a select or status's own name. */
function colorKeyOf(record: Page, propertyId: ID | null): string | null {
  if (!propertyId) return null;
  const raw = record.values?.[propertyId];
  if (typeof raw === "string") return raw || null;
  if (Array.isArray(raw)) return typeof raw[0] === "string" ? raw[0] : null;
  if (raw && typeof raw === "object") {
    const o = raw as { name?: unknown; id?: unknown };
    if (typeof o.name === "string") return o.name;
    if (typeof o.id === "string") return o.id;
  }
  return null;
}
