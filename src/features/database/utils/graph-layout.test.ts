import { describe, expect, it } from "vitest";
import type { ID } from "src/types";
import type { GraphEdge, GraphNode } from "./graph-model";
import { layoutGraph, nodeRadius } from "./graph-layout";

const BOX = { width: 1000, height: 600 };

const node = (id: ID): GraphNode => ({
  id,
  title: id,
  image: null,
  icon: null,
  iconKind: null,
  iconColor: null,
  updatedAt: null,
  own: true,
  sourceId: null,
  colorKey: null,
  degree: 0,
});
const join = (from: ID, to: ID): GraphEdge => ({
  from,
  to,
  propertyId: "rel",
  kind: "relation",
});
const apart = (
  at: Map<ID, { x: number; y: number }>,
  a: ID,
  b: ID,
): number => {
  const p = at.get(a)!;
  const q = at.get(b)!;
  return Math.hypot(p.x - q.x, p.y - q.y);
};

describe("where the pages settle", () => {
  const nodes = ["a", "b", "c", "d", "e", "f"].map(node);
  const edges = [join("a", "b"), join("c", "d"), join("e", "f")];

  it("puts the same graph in the same places every time", () => {
    const once = layoutGraph(nodes, edges, BOX);
    const again = layoutGraph(nodes, edges, BOX);
    expect([...again]).toEqual([...once]);
  });

  it("holds a page where it was put", () => {
    const at = layoutGraph(nodes, edges, {
      ...BOX,
      pinned: { c: { x: 123, y: 456 } },
    });
    expect(at.get("c")).toEqual({ x: 123, y: 456 });
  });

  it("keeps two joined pages nearer than two unjoined ones", () => {
    const at = layoutGraph(nodes, edges, BOX);
    expect(apart(at, "a", "b")).toBeLessThan(apart(at, "a", "c"));
  });
});

describe("colours that gather", () => {
  // Two colours, three pages each, and not one link between them: only the
  // group pull has anything to say about where they go.
  const nodes = [
    { ...node("a1"), colorKey: "red" },
    { ...node("a2"), colorKey: "red" },
    { ...node("a3"), colorKey: "red" },
    { ...node("b1"), colorKey: "blue" },
    { ...node("b2"), colorKey: "blue" },
    { ...node("b3"), colorKey: "blue" },
  ];
  const groups = new Map(nodes.map((n) => [n.id, n.colorKey]));
  const spread = (at: Map<ID, { x: number; y: number }>, ids: ID[]) => {
    const points = ids.map((id) => at.get(id)!);
    const mid = {
      x: points.reduce((s, p) => s + p.x, 0) / points.length,
      y: points.reduce((s, p) => s + p.y, 0) / points.length,
    };
    return (
      points.reduce((s, p) => s + Math.hypot(p.x - mid.x, p.y - mid.y), 0) /
      points.length
    );
  };

  it("draws same-coloured pages closer together than it would otherwise", () => {
    const loose = layoutGraph(nodes, [], BOX);
    const gathered = layoutGraph(nodes, [], { ...BOX, groups });
    expect(spread(gathered, ["a1", "a2", "a3"])).toBeLessThan(
      spread(loose, ["a1", "a2", "a3"]),
    );
  });

  it("still settles in the same places every time", () => {
    const once = layoutGraph(nodes, [], { ...BOX, groups });
    const again = layoutGraph(nodes, [], { ...BOX, groups });
    expect([...again]).toEqual([...once]);
  });

  it("changes nothing when no page has a colour", () => {
    const none = new Map(nodes.map((n) => [n.id, null]));
    expect([...layoutGraph(nodes, [], { ...BOX, groups: none })]).toEqual([
      ...layoutGraph(nodes, [], BOX),
    ]);
  });

  it("leaves a page with no colour out of the gathering", () => {
    // One red page turned colourless: the other two still gather, it does
    // not get dragged along with them.
    const mixed = nodes.map((n) =>
      n.id === "a3" ? { ...n, colorKey: null } : n,
    );
    const at = layoutGraph(mixed, [], {
      ...BOX,
      groups: new Map(mixed.map((n) => [n.id, n.colorKey])),
    });
    expect(apart(at, "a1", "a2")).toBeLessThan(apart(at, "a1", "a3"));
  });
});

describe("how big a page is drawn", () => {
  it("grows with its links and never disappears", () => {
    expect(nodeRadius(0)).toBeGreaterThan(0);
    expect(nodeRadius(4)).toBeGreaterThan(nodeRadius(0));
  });
});
