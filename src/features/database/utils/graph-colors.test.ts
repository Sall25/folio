import { describe, expect, it } from "vitest";
import type { DatabaseProperty } from "src/types";
import { accentVar, graphLegend } from "./graph-colors";
import { NO_GROUP_KEY } from "./group-key";

const select = {
  id: "type",
  name: "Type",
  config: {
    type: "select",
    options: [
      { id: "o1", label: "Lecture", color: "blue" },
      { id: "o2", label: "Assignment", color: "orange" },
    ],
  },
} as unknown as DatabaseProperty;

const status = {
  id: "stage",
  name: "Stage",
  config: {
    type: "status",
    groups: [
      {
        id: "g1",
        label: "To do",
        items: [{ id: "s1", name: "Not started", color: "gray" }],
      },
      {
        id: "g2",
        label: "Done",
        items: [{ id: "s2", name: "Shipped", color: "green" }],
      },
    ],
  },
} as unknown as DatabaseProperty;

const person = {
  id: "owner",
  name: "Owner",
  config: { type: "person" },
} as unknown as DatabaseProperty;

describe("what a colour on the canvas means", () => {
  it("is the option's own name, not the id it is stored under", () => {
    expect(graphLegend(select, ["o2", "o1"])).toEqual([
      {
        key: "o2",
        label: "Assignment",
        accent: "var(--tt-color-accent-orange)",
      },
      { key: "o1", label: "Lecture", accent: "var(--tt-color-accent-blue)" },
    ]);
  });

  it("reads a status through its groups", () => {
    expect(graphLegend(status, ["s2"])).toEqual([
      { key: "s2", label: "Shipped", accent: "var(--tt-color-accent-green)" },
    ]);
  });

  it("is in the order the values turned up, so it matches the canvas", () => {
    expect(graphLegend(select, ["o1", "o2"]).map((e) => e.key)).toEqual([
      "o1",
      "o2",
    ]);
  });

  it("says nothing about a page with no value", () => {
    expect(
      graphLegend(select, [NO_GROUP_KEY, "", "o1"]).map((e) => e.key),
    ).toEqual(["o1"]);
  });

  it("is empty when nothing is being coloured", () => {
    expect(graphLegend(undefined, ["o1"])).toEqual([]);
  });

  it("gives a value with no colour of its own one that is not gray", () => {
    // A person, a date, a number: the database has no accent stored for
    // them, and a graph still has to tell one from another.
    const legend = graphLegend(person, ["u1", "u2", "u3"], {
      personName: (id) => `Person ${id}`,
    });
    expect(legend.map((e) => e.label)).toEqual([
      "Person u1",
      "Person u2",
      "Person u3",
    ]);
    expect(new Set(legend.map((e) => e.accent)).size).toBe(3);
    expect(legend.some((e) => e.accent.includes("gray"))).toBe(false);
  });

  it("falls back to the key itself when nothing can name it", () => {
    expect(graphLegend(select, ["gone"])[0].label).toBe("gone");
  });
});

describe("an accent", () => {
  it("is the database's own token for that colour", () => {
    expect(accentVar("blue")).toBe("var(--tt-color-accent-blue)");
  });

  it("takes the legacy stored form too", () => {
    expect(accentVar("var(--tt-color-highlight-teal)")).toBe(
      "var(--tt-color-accent-teal)",
    );
  });

  it("is gray when there is no colour at all", () => {
    expect(accentVar(null)).toBe("var(--tt-color-accent-gray)");
  });
});
