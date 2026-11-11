import { describe, expect, it } from "vitest";
import {
  addedPeople,
  countAssignees,
  matchesPeopleFilter,
  UNASSIGNED,
  withAssignee,
} from "./assignee";

const me = { id: "me", name: "Me" };
const fa = { id: "fa", name: "Fatimata" };
const awa = { id: "awa", name: "Awa" };

describe("assigning", () => {
  it("adds me, or replaces the assignee when the property takes one person", () => {
    expect(withAssignee([fa], me, false)).toEqual([fa, me]);
    expect(withAssignee([fa], me, true)).toEqual([me]);
    expect(withAssignee(null, me, false)).toEqual([me]);
  });

  it("does nothing when I'm already assigned", () => {
    expect(withAssignee([fa, me], me, false)).toBeNull();
  });

  it("knows who was added (they get notified)", () => {
    expect(addedPeople([fa], [fa, awa, me])).toEqual([awa, me]);
    expect(addedPeople([fa, awa], [fa])).toEqual([]);
  });
});

describe("the people quick filter", () => {
  it("keeps rows with any picked person; Unassigned keeps empty rows", () => {
    expect(matchesPeopleFilter([fa, awa], ["awa"])).toBe(true);
    expect(matchesPeopleFilter([fa], ["awa"])).toBe(false);
    expect(matchesPeopleFilter([], [UNASSIGNED])).toBe(true);
    expect(matchesPeopleFilter(null, [UNASSIGNED, "fa"])).toBe(true);
    expect(matchesPeopleFilter([fa], [])).toBe(true);
  });

  it("counts each person's rows, and the unassigned ones", () => {
    const counts = countAssignees([[fa, me], [fa], [], null]);
    expect(counts.get("fa")?.count).toBe(2);
    expect(counts.get("me")?.count).toBe(1);
    expect(counts.get(UNASSIGNED)?.count).toBe(2);
  });
});
