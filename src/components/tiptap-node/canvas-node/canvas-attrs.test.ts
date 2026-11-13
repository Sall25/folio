import { describe, expect, it } from "vitest";
import {
  labelEdges,
  linkEdges,
  parseEdges,
  pruneEdges,
  unlinkEdges,
  type CanvasEdge,
} from "./canvas-attrs";

const edge = (over: Partial<CanvasEdge> = {}): CanvasEdge => ({
  id: "e1",
  from: "a",
  to: "b",
  fromSide: "right",
  toSide: "left",
  ...over,
});

describe("parseEdges", () => {
  it("reads the attribute as it is stored", () => {
    expect(parseEdges([edge()])).toEqual([edge()]);
  });

  it("reads the serialised form too, for a pasted canvas", () => {
    expect(parseEdges(JSON.stringify([edge()]))).toEqual([edge()]);
  });

  it("is quiet about rubbish rather than throwing inside a node view", () => {
    expect(parseEdges(undefined)).toEqual([]);
    expect(parseEdges(null)).toEqual([]);
    expect(parseEdges("{not json")).toEqual([]);
    expect(parseEdges({ from: "a" })).toEqual([]);
    expect(parseEdges([null, 7, "x"])).toEqual([]);
  });

  it("drops links that go nowhere, or to themselves", () => {
    expect(parseEdges([{ from: "a" }, { to: "b" }, { from: "a", to: "a" }])).toEqual(
      [],
    );
  });

  it("falls back to sane sides when they are missing or wrong", () => {
    const [e] = parseEdges([{ from: "a", to: "b", fromSide: "sideways" }]);
    expect(e.fromSide).toBe("right");
    expect(e.toSide).toBe("left");
  });

  it("keeps one of a repeated id", () => {
    expect(parseEdges([edge(), edge()])).toHaveLength(1);
  });
});

describe("linkEdges", () => {
  it("adds a link", () => {
    expect(linkEdges([], edge())).toEqual([edge()]);
  });

  it("moves the existing link instead of stacking a second one", () => {
    // Two edges between the same pair would sit on top of each other: the
    // one underneath could never be picked, let alone cut.
    const next = linkEdges(
      [edge()],
      edge({ id: "e2", fromSide: "bottom", toSide: "top" }),
    );
    expect(next).toHaveLength(1);
    expect(next[0].fromSide).toBe("bottom");
    expect(next[0].id).toBe("e2");
  });

  it("carries the old link's label across", () => {
    const next = linkEdges(
      [edge({ label: "depends on" })],
      edge({ id: "e2", fromSide: "top" }),
    );
    expect(next[0].label).toBe("depends on");
  });

  it("keeps the other direction as its own link", () => {
    const next = linkEdges([edge()], edge({ id: "e2", from: "b", to: "a" }));
    expect(next).toHaveLength(2);
  });

  it("refuses a link from a block to itself", () => {
    expect(linkEdges([], edge({ from: "a", to: "a" }))).toEqual([]);
  });

  it("leaves the other links alone", () => {
    const others = [edge({ id: "e9", from: "c", to: "d" })];
    expect(linkEdges(others, edge())).toHaveLength(2);
  });
});

describe("labelEdges", () => {
  it("labels the one edge", () => {
    const next = labelEdges([edge(), edge({ id: "e2" })], "e2", "reads first");
    expect(next[0].label).toBeUndefined();
    expect(next[1].label).toBe("reads first");
  });

  it("drops a label that is only whitespace", () => {
    const next = labelEdges([edge({ label: "old" })], "e1", "   ");
    expect(next[0].label).toBeUndefined();
  });

  it("trims what was typed", () => {
    expect(labelEdges([edge()], "e1", "  blocks ")[0].label).toBe("blocks");
  });
});

describe("unlinkEdges", () => {
  it("cuts the one edge", () => {
    expect(unlinkEdges([edge(), edge({ id: "e2" })], "e1")).toEqual([
      edge({ id: "e2" }),
    ]);
  });

  it("does nothing for an edge that is already gone", () => {
    expect(unlinkEdges([edge()], "nope")).toEqual([edge()]);
  });
});

describe("pruneEdges", () => {
  it("cuts the links of a block that is gone", () => {
    const edges = [edge(), edge({ id: "e2", from: "b", to: "c" })];
    expect(pruneEdges(edges, new Set(["a", "b"]))).toEqual([edge()]);
  });

  it("keeps every link whose blocks are both there", () => {
    const edges = [edge(), edge({ id: "e2", from: "b", to: "a" })];
    expect(pruneEdges(edges, new Set(["a", "b"]))).toEqual(edges);
  });

  it("cuts a link in both directions", () => {
    const edges = [edge(), edge({ id: "e2", from: "b", to: "a" })];
    expect(pruneEdges(edges, new Set(["a"]))).toEqual([]);
  });

  it("is empty when the canvas is", () => {
    expect(pruneEdges([edge()], new Set())).toEqual([]);
  });
});
