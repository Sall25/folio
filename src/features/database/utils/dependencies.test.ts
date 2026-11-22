import { describe, expect, it } from "vitest";
import type { DatabaseProperty, Page } from "src/types";
import {
  canLink,
  linkConflict,
  dependencyEdges,
  dependencyPair,
  blockingIdsOf,
  linkMidpoint,
  linkPath,
  wouldCycle,
} from "./dependencies";

const row = (id: string, blocking: string[] = []): Page =>
  ({ id, title: id, values: { B: blocking } }) as unknown as Page;

const pairProps = (extra: Partial<DatabaseProperty> = {}) =>
  [
    {
      id: "B",
      name: "Blocking",
      config: {
        type: "relation",
        targetSourceId: "s",
        showOnTarget: true,
        mirrorPropertyId: "W",
        dependency: true,
      },
      ...extra,
    },
    {
      id: "W",
      name: "Blocked by",
      config: {
        type: "relation",
        targetSourceId: "s",
        showOnTarget: false,
        mirrorPropertyId: "B",
      },
    },
  ] as unknown as DatabaseProperty[];

describe("the dependency pair", () => {
  it("is found by its stored side", () => {
    const pair = dependencyPair(pairProps(), "s");
    expect(pair?.blocking.id).toBe("B");
    expect(pair?.blockedBy?.id).toBe("W");
  });

  it("is not a sub-item pair, nor a plain relation", () => {
    const subItems = [
      {
        id: "P",
        name: "Parent",
        config: {
          type: "relation",
          targetSourceId: "s",
          showOnTarget: true,
          mirrorPropertyId: "C",
          subItems: true,
        },
      },
      {
        id: "R",
        name: "Related",
        config: {
          type: "relation",
          targetSourceId: "s",
          showOnTarget: true,
          mirrorPropertyId: null,
        },
      },
    ] as unknown as DatabaseProperty[];
    expect(dependencyPair(subItems, "s")).toBeNull();
  });

  it("is only this database's own", () => {
    // A relation pointing at another database can hold anything; it is not
    // what the arrows are drawn from.
    expect(dependencyPair(pairProps(), "other")).toBeNull();
  });

  it("stands without its mirror", () => {
    const [blocking] = pairProps();
    const pair = dependencyPair([blocking], "s");
    expect(pair?.blocking.id).toBe("B");
    expect(pair?.blockedBy).toBeNull();
  });

  it("reads a record's links through either stored shape", () => {
    const bare = { id: "a", values: { B: ["b", "c"] } } as unknown as Page;
    const objects = {
      id: "a",
      values: { B: [{ pageId: "b" }, { recordId: "c" }] },
    } as unknown as Page;
    expect(blockingIdsOf(bare, "B")).toEqual(["b", "c"]);
    expect(blockingIdsOf(objects, "B")).toEqual(["b", "c"]);
    expect(blockingIdsOf({ id: "a" } as Page, "B")).toEqual([]);
  });
});

describe("the links a view draws", () => {
  it("is one edge per link, in the rows' own order", () => {
    const rows = [row("kick", ["deposit", "review"]), row("deposit", ["ship"])];
    expect(dependencyEdges([...rows, row("review"), row("ship")], "B")).toEqual(
      [
        { from: "kick", to: "deposit" },
        { from: "kick", to: "review" },
        { from: "deposit", to: "ship" },
      ],
    );
  });

  it("leaves out what isn't on screen", () => {
    // Filtered out, or deleted since: there is no second bar to draw to.
    const rows = [row("kick", ["gone", "deposit"]), row("deposit")];
    expect(dependencyEdges(rows, "B")).toEqual([
      { from: "kick", to: "deposit" },
    ]);
  });

  it("leaves out a record linked to itself, and says a thing once", () => {
    const rows = [row("kick", ["kick", "deposit", "deposit"]), row("deposit")];
    expect(dependencyEdges(rows, "B")).toEqual([
      { from: "kick", to: "deposit" },
    ]);
  });
});

describe("a link that would close a loop", () => {
  // kick → deposit → ship
  const edges = [
    { from: "kick", to: "deposit" },
    { from: "deposit", to: "ship" },
  ];

  it("is refused, however long the way round", () => {
    expect(wouldCycle(edges, "ship", "kick")).toBe(true);
    expect(wouldCycle(edges, "deposit", "kick")).toBe(true);
    expect(wouldCycle(edges, "kick", "kick")).toBe(true);
  });

  it("allows everything that doesn't", () => {
    expect(wouldCycle(edges, "kick", "ship")).toBe(false); // already implied
    expect(wouldCycle(edges, "ship", "later")).toBe(false);
    expect(wouldCycle(edges, "apart", "kick")).toBe(false);
  });

  it("does not hang on a loop that is already there", () => {
    // Bad data, or two people linking at once: the walk still ends.
    const ring = [
      { from: "a", to: "b" },
      { from: "b", to: "a" },
    ];
    expect(wouldCycle(ring, "b", "c")).toBe(false);
    expect(wouldCycle(ring, "a", "b")).toBe(true);
  });
});

describe("the curve between two bars", () => {
  const ends = (d: string) => {
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    return {
      start: { x: nums[0], y: nums[1] },
      end: { x: nums[nums.length - 2], y: nums[nums.length - 1] },
    };
  };

  it("runs from where it is given to where it is going", () => {
    const d = linkPath({ x: 100, y: 20 }, { x: 300, y: 54 });
    expect(ends(d).start).toEqual({ x: 100, y: 20 });
    expect(ends(d).end).toEqual({ x: 300, y: 54 });
  });

  it("is one curve when the next bar starts after this one ends", () => {
    const d = linkPath({ x: 100, y: 20 }, { x: 300, y: 54 });
    expect(d.match(/C/g)).toHaveLength(1);
    // Leaves and arrives horizontally: both handles share their point's y.
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(nums[3]).toBe(20); // first handle, on the start's line
    expect(nums[5]).toBe(54); // second handle, on the end's line
  });

  it("goes round when the next bar starts first", () => {
    // The whole point of the arrow: it says the dates are the wrong way
    // round. It must not be drawn straight through the two bars.
    const d = linkPath({ x: 300, y: 20 }, { x: 120, y: 54 });
    expect(d.match(/C/g)).toHaveLength(2);
    const xs = d
      .match(/-?\d+(\.\d+)?\s\d+(\.\d+)?/g)!
      .map((p) => Number(p.split(" ")[0]));
    expect(Math.max(...xs)).toBeGreaterThan(300); // out past the first bar
    expect(Math.min(...xs)).toBeLessThan(120); // and back past the second
  });

  it("goes round when the two bars only just meet", () => {
    // A gap too small for a curve to turn in still gets the long way round.
    expect(
      linkPath({ x: 100, y: 20 }, { x: 110, y: 54 }).match(/C/g),
    ).toHaveLength(2);
    expect(
      linkPath({ x: 100, y: 20 }, { x: 140, y: 54 }).match(/C/g),
    ).toHaveLength(1);
  });

  it("carries no more digits than a screen can show", () => {
    const d = linkPath({ x: 100.123456, y: 20.98765 }, { x: 300.5, y: 54.25 });
    expect(d).not.toMatch(/\.\d{3}/);
  });
});

// ── Drawing a link from one bar to another ───────────────────────────────

describe("whether a link can be made", () => {
  // kick → deposit → ship, and a record nothing touches.
  const blocking = { kick: ["deposit"], deposit: ["ship"] };

  it("allows a new one", () => {
    expect(canLink(blocking, "ship", "spare")).toBe(true);
    expect(canLink(blocking, "kick", "ship")).toBe(true); // already implied
  });

  it("refuses a record to itself", () => {
    expect(canLink(blocking, "kick", "kick")).toBe(false);
  });

  it("refuses one that is already there", () => {
    expect(canLink(blocking, "kick", "deposit")).toBe(false);
  });

  it("refuses one that would make a record wait on itself", () => {
    expect(canLink(blocking, "ship", "kick")).toBe(false);
    expect(canLink(blocking, "deposit", "kick")).toBe(false);
  });

  it("counts links to records the view is not showing", () => {
    // The loop runs through a record filtered out of the timeline. It is
    // still a loop, and the arrows not being drawn does not make it one
    // the dates could ever satisfy.
    const through = { kick: ["hidden"], hidden: ["ship"] };
    expect(canLink(through, "ship", "kick")).toBe(false);
  });

  it("says no to nothing at all", () => {
    expect(canLink(blocking, "", "kick")).toBe(false);
    expect(canLink(blocking, "kick", "")).toBe(false);
  });
});

// ── A link whose records overlap ──────────────────────────────────────────
// The record waiting starts before the one blocking it has finished: the
// plan contradicts itself, and the arrow is drawn red to say so.

describe("a link in trouble", () => {
  const dated = (start: string, end: string, allDay = true) => ({
    start: new Date(start + "T00:00:00"),
    end: new Date(end + "T00:00:00"),
    allDay,
  });

  it("is quiet when the waiting record starts after", () => {
    const blocker = dated("2026-11-02", "2026-11-06");
    expect(linkConflict(blocker, dated("2026-11-07", "2026-11-10"))).toBe(
      false,
    );
  });

  it("flags one that starts on the blocker's last day", () => {
    // A record dated to the 6th is busy all of the 6th.
    const blocker = dated("2026-11-02", "2026-11-06");
    expect(linkConflict(blocker, dated("2026-11-06", "2026-11-10"))).toBe(true);
  });

  it("flags one that starts before the blocker does", () => {
    const blocker = dated("2026-11-02", "2026-11-06");
    expect(linkConflict(blocker, dated("2026-10-28", "2026-11-03"))).toBe(true);
  });

  it("counts the hours when the records carry them", () => {
    // Day: a meeting ending at ten does not block one starting at eleven.
    const blocker = {
      start: new Date(2026, 10, 2, 9),
      end: new Date(2026, 10, 2, 10),
      allDay: false,
    };
    expect(
      linkConflict(blocker, {
        start: new Date(2026, 10, 2, 11),
        end: new Date(2026, 10, 2, 12),
        allDay: false,
      }),
    ).toBe(false);
    expect(
      linkConflict(blocker, {
        start: new Date(2026, 10, 2, 9, 30),
        end: null,
        allDay: false,
      }),
    ).toBe(true);
  });

  it("holds its tongue when a date is missing", () => {
    // A record with no dates has no bar, and nothing to be wrong about.
    expect(
      linkConflict(dated("2026-11-02", "2026-11-06"), {
        start: null,
        end: null,
        allDay: true,
      }),
    ).toBe(false);
    expect(linkConflict(undefined, dated("2026-11-02", "2026-11-06"))).toBe(
      false,
    );
  });

  it("treats a record with no end as lasting its one day", () => {
    const oneDay = { start: new Date(2026, 10, 2), end: null, allDay: true };
    expect(
      linkConflict(oneDay, {
        start: new Date(2026, 10, 2),
        end: null,
        allDay: true,
      }),
    ).toBe(true);
    expect(
      linkConflict(oneDay, {
        start: new Date(2026, 10, 3),
        end: null,
        allDay: true,
      }),
    ).toBe(false);
  });
});

// ── Where the button that unlinks sits ───────────────────────────────────

describe("the middle of a link", () => {
  it("is halfway between the two ends, the usual way round", () => {
    expect(linkMidpoint({ x: 100, y: 20 }, { x: 300, y: 60 })).toEqual({
      x: 200,
      y: 40,
    });
  });

  it("is on the curve, not merely between the ends, going round", () => {
    // Going round, the path is two curves joined; the join is its middle,
    // and it sits between the two bars rather than on top of either.
    const a = { x: 300, y: 20 };
    const b = { x: 120, y: 60 };
    const mid = linkMidpoint(a, b);
    expect(mid.y).toBe(40);
    expect(mid.x).toBeGreaterThan(b.x);
    expect(mid.x).toBeLessThan(a.x);
  });

  it("stays put when the two ends share a row", () => {
    expect(linkMidpoint({ x: 100, y: 40 }, { x: 260, y: 40 })).toEqual({
      x: 180,
      y: 40,
    });
  });
});
