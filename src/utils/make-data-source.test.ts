import { describe, expect, it } from "vitest";
import { makeDataSource } from "./make-data-source";
import type { DatabaseProperty } from "../types";

// What a new database is born with.
//
// A view can only show what the database holds, so each one starts with the
// property it cannot open without: a board its Status, a calendar and a
// timeline their Date, a graph the relation it draws. Everything else gets
// Tags, which is somewhere to put a colour.

const named = (properties: DatabaseProperty[]) => properties.map((p) => p.name);
const typed = (properties: DatabaseProperty[]) =>
  properties.map((p) => p.config.type);

describe("the properties a new database starts with", () => {
  it("always begins with the title", () => {
    expect(
      typed(makeDataSource({ name: "x", pageId: null }).properties)[0],
    ).toBe("title");
  });

  it("gives a board its status", () => {
    const { properties } = makeDataSource({
      name: "x",
      pageId: null,
      viewType: "board",
    });
    expect(typed(properties)).toContain("status");
  });

  it("gives a calendar and a timeline a date", () => {
    for (const viewType of ["calendar", "timeline"] as const) {
      const { properties } = makeDataSource({
        name: "x",
        pageId: null,
        viewType,
      });
      expect(typed(properties)).toContain("date");
    }
  });

  it("gives a graph the relation it draws, pointing at itself", () => {
    const source = makeDataSource({
      name: "x",
      pageId: null,
      viewType: "graph",
    });
    const relations = source.properties.filter(
      (p) => p.config.type === "relation",
    );
    expect(relations).toHaveLength(2);
    for (const relation of relations) {
      if (relation.config.type !== "relation")
        throw new Error("not a relation");
      // Its own database: a graph joins a page to another page of the same
      // database, not to somewhere else.
      expect(relation.config.targetSourceId).toBe(source.id);
    }
  });

  it("makes that relation a pair: one side stored, one derived", () => {
    const { properties } = makeDataSource({
      name: "x",
      pageId: null,
      viewType: "graph",
    });
    const [stored, mirror] = properties.filter(
      (p) => p.config.type === "relation",
    );
    if (stored.config.type !== "relation" || mirror.config.type !== "relation")
      throw new Error("not relations");
    expect(stored.config.showOnTarget).toBe(true);
    expect(mirror.config.showOnTarget).toBe(false);
    // Each names the other, which is what makes them one relation read both
    // ways rather than two unrelated ones.
    expect(stored.config.mirrorPropertyId).toBe(mirror.id);
    expect(mirror.config.mirrorPropertyId).toBe(stored.id);
  });

  it("points the relation at the id the source is actually given", () => {
    const source = makeDataSource({
      name: "x",
      pageId: null,
      sourceId: "s-1",
      viewType: "graph",
    });
    const relation = source.properties.find(
      (p) => p.config.type === "relation",
    );
    if (relation?.config.type !== "relation") throw new Error("not a relation");
    expect(relation.config.targetSourceId).toBe("s-1");
  });

  it("gives everything else somewhere to put a colour", () => {
    const { properties } = makeDataSource({
      name: "x",
      pageId: null,
      viewType: "gallery",
    });
    expect(named(properties)).toContain("Tags");
  });
});
