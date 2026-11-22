import { describe, expect, it } from "vitest";
import type { DatabaseProperty, GraphView, Page } from "src/types";
import {
  buildGraph,
  canConnectWith,
  linkCounts,
  linkProperties,
  relationProperties,
} from "./graph-model";
import { fitIntoView, layoutGraph, nodeRadius } from "./graph-layout";

const relation = (id: string, extra: Record<string, unknown> = {}) =>
  ({
    id,
    name: id,
    config: {
      type: "relation",
      targetSourceId: "s",
      showOnTarget: true,
      mirrorPropertyId: null,
      ...extra,
    },
  }) as unknown as DatabaseProperty;

const props = [
  relation("blocking", { dependency: true, mirrorPropertyId: "blockedBy" }),
  // The derived side: the same links read backwards.
  relation("blockedBy", { showOnTarget: false, mirrorPropertyId: "blocking" }),
  relation("parent", { subItems: true, mirrorPropertyId: "children" }),
  relation("children", { showOnTarget: false, mirrorPropertyId: "parent" }),
  { id: "status", name: "Status", config: { type: "status" } },
] as unknown as DatabaseProperty[];

const row = (id: string, values: Record<string, unknown> = {}): Page =>
  ({ id, title: id, sourceId: "s", values }) as unknown as Page;

const view = (patch: Partial<GraphView> = {}) =>
  ({ id: "g", name: "Graph", type: "graph", ...patch }) as GraphView;

describe("which relations a graph draws", () => {
  it("is every one of them, until someone chooses", () => {
    expect(linkProperties(props, view()).map((p) => p.id)).toEqual([
      "blocking",
      "parent",
    ]);
  });

  it("leaves out the derived side, or every link would be drawn twice", () => {
    expect(linkProperties(props, view()).map((p) => p.id)).not.toContain(
      "blockedBy",
    );
  });

  it("is the chosen ones when there are any", () => {
    expect(
      linkProperties(props, view({ linkPropertyIds: ["parent"] })).map(
        (p) => p.id,
      ),
    ).toEqual(["parent"]);
  });
});

describe("the graph of a view's records", () => {
  const records = [
    row("kick", { blocking: ["brief"], status: "Done" }),
    row("brief", { blocking: ["research"], status: "Doing" }),
    row("research", { status: "Doing" }),
    row("survey", { parent: ["research"], status: "Todo" }),
  ];
  const none = () => undefined;

  it("is a node per record and an edge per link", () => {
    const g = buildGraph(records, props, view(), none);
    expect(g.nodes.map((n) => n.id).sort()).toEqual([
      "brief",
      "kick",
      "research",
      "survey",
    ]);
    expect(g.edges).toEqual([
      { from: "kick", to: "brief", propertyId: "blocking", kind: "relation" },
      {
        from: "brief",
        to: "research",
        propertyId: "blocking",
        kind: "relation",
      },
      {
        from: "survey",
        to: "research",
        propertyId: "parent",
        kind: "relation",
      },
    ]);
  });

  it("counts what touches each node, which is how big it is drawn", () => {
    const g = buildGraph(records, props, view(), none);
    const degree = Object.fromEntries(g.nodes.map((n) => [n.id, n.degree]));
    expect(degree).toEqual({ kick: 1, brief: 2, research: 2, survey: 1 });
    expect(nodeRadius(degree.brief)).toBeGreaterThan(nodeRadius(degree.kick));
  });

  it("knows each node's neighbours, both ways round", () => {
    const g = buildGraph(records, props, view(), none);
    expect([...(g.neighbours.get("research") ?? [])].sort()).toEqual([
      "brief",
      "survey",
    ]);
  });

  it("takes a colour from the property the view colours by", () => {
    const g = buildGraph(
      records,
      props,
      view({ colorPropertyId: "status" }),
      none,
    );
    expect(g.nodes.find((n) => n.id === "kick")?.colorKey).toBe("Done");
    const plain = buildGraph(records, props, view(), none);
    expect(plain.nodes.every((n) => n.colorKey === null)).toBe(true);
  });

  it("drops a link to a record nobody can find", () => {
    // Deleted, or beyond this person's access: there is no node to join to,
    // and a line to nowhere says less than the record's own page does.
    const g = buildGraph(
      [row("a", { blocking: ["ghost"] })],
      props,
      view(),
      none,
    );
    expect(g.edges).toEqual([]);
    expect(g.nodes).toHaveLength(1);
  });

  it("brings in a record from another database, marked as not its own", () => {
    const outsider = {
      id: "doc",
      title: "Spec",
      sourceId: "other",
      values: {},
    } as unknown as Page;
    const g = buildGraph(
      [row("a", { blocking: ["doc"] })],
      props,
      view({ includeLinked: true }),
      (id) => (id === "doc" ? outsider : undefined),
    );
    const node = g.nodes.find((n) => n.id === "doc");
    expect(node?.own).toBe(false);
    expect(node?.sourceId).toBe("other");
    expect(g.edges).toHaveLength(1);
  });

  it("leaves it out when the view says to stay at home", () => {
    const outsider = { id: "doc", title: "Spec", sourceId: "other" } as Page;
    const g = buildGraph(
      [row("a", { blocking: ["doc"] })],
      props,
      view({ includeLinked: false }),
      () => outsider,
    );
    expect(g.nodes).toHaveLength(1);
    expect(g.edges).toEqual([]);
  });

  it("ignores a record linked to itself", () => {
    const g = buildGraph([row("a", { blocking: ["a"] })], props, view(), none);
    expect(g.edges).toEqual([]);
  });
});

describe("where the nodes go", () => {
  const nodes = ["a", "b", "c", "d", "e"].map((id, i) => ({
    id,
    title: id,
    image: null,
    icon: null,
    own: true,
    sourceId: "s",
    colorKey: null,
    degree: i === 0 ? 3 : 1,
  }));
  const edges = [
    { from: "a", to: "b", propertyId: "r", kind: "relation" as const },
    { from: "a", to: "c", propertyId: "r", kind: "relation" as const },
    { from: "a", to: "d", propertyId: "r", kind: "relation" as const },
  ];
  const box = { width: 800, height: 500 };

  it("settles the same way every time", () => {
    // The point of writing the layout rather than pulling one in: a graph
    // that rearranges itself under the person on every open is a different
    // graph each time.
    const a = layoutGraph(nodes, edges, box);
    const b = layoutGraph(nodes, edges, box);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });

  it("puts every node somewhere real", () => {
    const at = layoutGraph(nodes, edges, box);
    expect(at.size).toBe(nodes.length);
    for (const p of at.values()) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });

  it("keeps two nodes apart, joined or not", () => {
    const at = layoutGraph(nodes, edges, box);
    const pts = [...at.values()];
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        expect(
          Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y),
        ).toBeGreaterThan(20);
  });

  it("holds a pinned node exactly where it was put", () => {
    const pinned = { a: { x: 120, y: 90 } };
    const at = layoutGraph(nodes, edges, { ...box, pinned });
    expect(at.get("a")).toEqual({ x: 120, y: 90 });
  });

  it("survives a graph of one, and of none", () => {
    expect(layoutGraph([nodes[0]], [], box).size).toBe(1);
    expect(layoutGraph([], [], box).size).toBe(0);
  });

  it("fits what settled inside the box", () => {
    const { at } = fitIntoView(layoutGraph(nodes, edges, box), box);
    for (const p of at.values()) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(box.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(box.height);
    }
  });

  it("does not blow three records up to fill a screen", () => {
    const three = nodes.slice(0, 3);
    const { scale } = fitIntoView(layoutGraph(three, [edges[0]], box), box);
    expect(scale).toBeLessThanOrEqual(1.4);
  });

  it("fits nothing without dividing by it", () => {
    expect(fitIntoView(new Map(), box).at.size).toBe(0);
  });
});

// ── Dragging one node onto another ───────────────────────────────────────

describe("whether a drag can make a link", () => {
  // kick → brief → research, through the dependency property.
  const links: Record<string, string[]> = {
    kick: ["brief"],
    brief: ["research"],
  };
  const linksOf = (id: string) => links[id] ?? [];
  const dependency = props[0]; // Blocking, dependency: true
  const plain = relation("related");

  it("allows a new one", () => {
    expect(canConnectWith(dependency, linksOf, "research", "spare")).toBe(true);
  });

  it("refuses a node onto itself", () => {
    expect(canConnectWith(dependency, linksOf, "kick", "kick")).toBe(false);
  });

  it("refuses one that is already drawn", () => {
    expect(canConnectWith(dependency, linksOf, "kick", "brief")).toBe(false);
  });

  it("refuses a loop, but only where a loop is nonsense", () => {
    // A dependency ring is a plan nothing could start; "related to" going
    // round and round is just two records that mention each other.
    expect(canConnectWith(dependency, linksOf, "research", "kick")).toBe(false);
    expect(canConnectWith(plain, linksOf, "research", "kick")).toBe(true);
  });

  it("refuses everything when the database has no relation to write", () => {
    expect(canConnectWith(null, linksOf, "kick", "research")).toBe(false);
  });

  it("does not hang on a ring that is already there", () => {
    const ring: Record<string, string[]> = { a: ["b"], b: ["a"] };
    expect(canConnectWith(dependency, (id) => ring[id] ?? [], "b", "c")).toBe(
      true,
    );
  });
});

// ── Links written in the page itself ─────────────────────────────────────
// A graph of pages is first of all a graph of what people wrote into one
// another: a page link in the text is a connection, and needs no property
// to exist first.

describe("the links inside a page", () => {
  const doc = (...ids: string[]) => ({
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "see " }] },
      ...ids.map((pageId) => ({ type: "pageLink", attrs: { pageId } })),
    ],
  });

  it("joins the pages they point at", () => {
    const records = [
      { id: "a", title: "A", sourceId: "s", values: {}, content: doc("b") },
      { id: "b", title: "B", sourceId: "s", values: {}, content: doc() },
    ] as unknown as Page[];
    const g = buildGraph(records, props, view(), () => undefined);
    expect(g.edges).toEqual([
      { from: "a", to: "b", propertyId: null, kind: "link" },
    ]);
  });

  it("counts a mention of a page the same way", () => {
    const records = [
      {
        id: "a",
        title: "A",
        sourceId: "s",
        values: {},
        content: {
          type: "doc",
          content: [{ type: "mention", attrs: { id: "b" } }],
        },
      },
      { id: "b", title: "B", sourceId: "s", values: {} },
    ] as unknown as Page[];
    expect(buildGraph(records, props, view(), () => undefined).edges).toEqual([
      { from: "a", to: "b", propertyId: null, kind: "link" },
    ]);
  });

  it("says a link once, however many times it is written", () => {
    const records = [
      {
        id: "a",
        title: "A",
        sourceId: "s",
        values: {},
        content: doc("b", "b", "b"),
      },
      { id: "b", title: "B", sourceId: "s", values: {} },
    ] as unknown as Page[];
    expect(
      buildGraph(records, props, view(), () => undefined).edges,
    ).toHaveLength(1);
  });

  it("gives a node the page's cover, or the first picture in it", () => {
    const records = [
      {
        id: "a",
        title: "A",
        sourceId: "s",
        values: {},
        cover: { coverImage: "https://x/cover.png", iconName: "🌱" },
      },
      {
        id: "b",
        title: "B",
        sourceId: "s",
        values: {},
        content: {
          type: "doc",
          content: [{ type: "image", attrs: { src: "https://x/inside.png" } }],
        },
      },
    ] as unknown as Page[];
    const g = buildGraph(records, props, view(), () => undefined);
    expect(g.nodes[0].image).toBe("https://x/cover.png");
    expect(g.nodes[0].icon).toBe("🌱");
    expect(g.nodes[1].image).toBe("https://x/inside.png");
  });
});

// ── What the connections panel switches ─────────────────────────────────────
// A graph that leaves something out has to be able to say what, and how
// much: an offer with no number beside it tells nobody whether taking it
// would change anything.

describe("leaving things out", () => {
  const doc = (...ids: string[]) => ({
    type: "doc",
    content: ids.map((pageId) => ({ type: "pageLink", attrs: { pageId } })),
  });
  const records = [
    {
      id: "a",
      title: "A",
      sourceId: "s",
      values: { blocking: ["b"] },
      content: doc("c"),
    },
    { id: "b", title: "B", sourceId: "s", values: {}, content: doc() },
    { id: "c", title: "C", sourceId: "s", values: {}, content: doc() },
    {
      id: "lonely",
      title: "Lonely",
      sourceId: "s",
      values: {},
      content: doc(),
    },
  ] as unknown as Page[];
  const none = () => undefined;

  it("draws the links written in pages until it is told not to", () => {
    expect(
      buildGraph(records, props, view(), none).edges.filter(
        (e) => e.kind === "link",
      ),
    ).toHaveLength(1);
    expect(
      buildGraph(records, props, view({ showPageLinks: false }), none).edges,
    ).toEqual([
      { from: "a", to: "b", propertyId: "blocking", kind: "relation" },
    ]);
  });

  it("keeps a page nothing is joined to, unless it is told not to", () => {
    const shown = buildGraph(records, props, view(), none);
    expect(shown.nodes.map((n) => n.id)).toContain("lonely");
    const hidden = buildGraph(
      records,
      props,
      view({ hideUnlinked: true }),
      none,
    );
    expect(hidden.nodes.map((n) => n.id)).not.toContain("lonely");
    // And nothing else goes with it.
    expect(hidden.nodes).toHaveLength(3);
  });

  it("counts every relation, drawn or not, and the links too", () => {
    const counts = linkCounts(records, props);
    expect(counts.byProperty.get("blocking")).toBe(1);
    expect(counts.byProperty.get("parent")).toBe(0);
    expect(counts.pageLinks).toBe(1);
    // The derived side is not a choice anyone is offered.
    expect(counts.byProperty.has("blockedBy")).toBe(false);
  });

  it("counts what is written, not what is drawn", () => {
    // Switched off in the view, and still counted: the number is what makes
    // switching it back on worth doing.
    const counts = linkCounts(records, props);
    const drawn = buildGraph(
      records,
      props,
      view({ linkPropertyIds: ["parent"] }),
      none,
    );
    expect(drawn.edges.some((e) => e.propertyId === "blocking")).toBe(false);
    expect(counts.byProperty.get("blocking")).toBe(1);
  });

  it("offers every relation there is, without the derived sides", () => {
    expect(relationProperties(props).map((p) => p.id)).toEqual([
      "blocking",
      "parent",
    ]);
  });
});
