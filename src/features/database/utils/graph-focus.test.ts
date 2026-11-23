import { describe, expect, it } from "vitest";
import type { ID } from "src/types";
import {
  ageFade,
  chainBetween,
  FAINTEST,
  hopsFrom,
  matching,
  STALE_DAYS,
} from "./graph-focus";

/** a—b—c—d, with e joined to nothing. */
const joins = (pairs: [ID, ID][]) => {
  const map = new Map<ID, Set<ID>>();
  const add = (x: ID, y: ID) => {
    const set = map.get(x) ?? new Set<ID>();
    set.add(y);
    map.set(x, set);
  };
  for (const [x, y] of pairs) {
    add(x, y);
    add(y, x);
  }
  return map;
};
const line = joins([
  ["a", "b"],
  ["b", "c"],
  ["c", "d"],
]);

describe("how far away everything is", () => {
  it("counts the page itself as no distance at all", () => {
    expect(hopsFrom(line, "a").get("a")).toBe(0);
  });

  it("counts each link as one step", () => {
    const hops = hopsFrom(line, "a");
    expect([hops.get("b"), hops.get("c"), hops.get("d")]).toEqual([1, 2, 3]);
  });

  it("takes the shortest way round, not the first one tried", () => {
    // a—b—c—d the long way, a—d the short way.
    const ring = joins([
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
      ["a", "d"],
    ]);
    expect(hopsFrom(ring, "a").get("d")).toBe(1);
  });

  it("leaves out a page nothing joins to this one", () => {
    expect(hopsFrom(line, "a").has("e")).toBe(false);
  });

  it("says nothing at all about a page that is not there", () => {
    expect(hopsFrom(line, "").size).toBe(0);
  });
});

describe("the chain between two pages", () => {
  it("is both ends and everything on the way, in order", () => {
    expect(chainBetween(line, "a", "d")).toEqual(["a", "b", "c", "d"]);
  });

  it("reads the same way round whichever end you start from", () => {
    expect(chainBetween(line, "d", "a")).toEqual(["d", "c", "b", "a"]);
  });

  it("is the shortest one when there are two", () => {
    const ring = joins([
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
      ["a", "d"],
    ]);
    expect(chainBetween(ring, "a", "d")).toEqual(["a", "d"]);
  });

  it("is the page itself when both ends are the same page", () => {
    expect(chainBetween(line, "b", "b")).toEqual(["b"]);
  });

  it("is empty when nothing joins them", () => {
    expect(chainBetween(line, "a", "e")).toEqual([]);
  });
});

describe("finding a page by what was typed", () => {
  const nodes = [
    { id: "1", title: "Résumé du cours" },
    { id: "2", title: "Exam plan" },
    { id: "3", title: "Reading list" },
  ];

  it("ignores case", () => {
    expect([...matching(nodes, "EXAM")]).toEqual(["2"]);
  });

  it("ignores accents, in both directions", () => {
    expect([...matching(nodes, "resume")]).toEqual(["1"]);
    expect([...matching(nodes, "Résumé")]).toEqual(["1"]);
  });

  it("matches inside a title, not only at the start", () => {
    expect([...matching(nodes, "list")]).toEqual(["3"]);
  });

  it("matches nothing when nothing was typed", () => {
    expect(matching(nodes, "   ").size).toBe(0);
  });

  it("matches nothing rather than everything when there is no hit", () => {
    expect(matching(nodes, "rubric").size).toBe(0);
  });
});

describe("how faint an old page is drawn", () => {
  const now = Date.parse("2026-11-23T12:00:00Z");
  const daysAgo = (n: number) => now - n * 24 * 60 * 60 * 1000;

  it("draws a page edited today in full", () => {
    expect(ageFade(daysAgo(0), now)).toBe(1);
  });

  it("fades further the longer it has been", () => {
    const a = ageFade(daysAgo(5), now);
    const b = ageFade(daysAgo(30), now);
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(FAINTEST);
  });

  it("stops fading once it is old, however old", () => {
    expect(ageFade(daysAgo(STALE_DAYS), now)).toBeCloseTo(FAINTEST, 6);
    expect(ageFade(daysAgo(900), now)).toBe(FAINTEST);
  });

  it("draws a page with no edit recorded in full", () => {
    expect(ageFade(null, now)).toBe(1);
    expect(ageFade(undefined, now)).toBe(1);
  });

  it("is not thrown by a clock that disagrees", () => {
    expect(ageFade(daysAgo(-3), now)).toBe(1);
  });
});
