import { describe, expect, it } from "vitest";
import {
  canWriteSkeleton,
  isBlankDoc,
  skeletonContent,
  type DocLike,
} from "./first-version";

// A database's own page lost its block, or showed it twice: the skeleton
// written for a page created on this device raced the server's seeding.

const doc = (...names: { name: string; size?: number }[]): DocLike => ({
  childCount: names.length,
  firstChild: names[0]
    ? { type: { name: names[0].name }, content: { size: names[0].size ?? 0 } }
    : null,
});

describe("isBlankDoc", () => {
  it("is blank with nothing in it", () => {
    expect(isBlankDoc(doc())).toBe(true);
    expect(isBlankDoc(doc({ name: "paragraph" }))).toBe(true);
  });

  it("isn't blank once anything has arrived", () => {
    expect(isBlankDoc(doc({ name: "paragraph", size: 4 }))).toBe(false);
    expect(isBlankDoc(doc({ name: "title" }))).toBe(false);
    expect(isBlankDoc(doc({ name: "database" }))).toBe(false);
    expect(isBlankDoc(doc({ name: "paragraph" }, { name: "paragraph" }))).toBe(
      false,
    );
  });
});

describe("canWriteSkeleton", () => {
  it("writes it for an ordinary new page", () => {
    expect(canWriteSkeleton(null)).toBe(true);
    expect(canWriteSkeleton({ type: "doc", content: [] })).toBe(true);
    expect(
      canWriteSkeleton({
        type: "doc",
        content: [
          { type: "title", content: [{ type: "text", text: "Notes" }] },
          { type: "paragraph" },
        ],
      }),
    ).toBe(true);
  });

  it("waits for the server on a database's own page", () => {
    // [title, database]: writing the skeleton here either loses the block
    // (the server stops seeding) or ends up with it twice.
    expect(
      canWriteSkeleton({
        type: "doc",
        content: [
          { type: "title", content: [{ type: "text", text: "New Form" }] },
          { type: "database", attrs: { sourceId: "s1" } },
        ],
      }),
    ).toBe(false);
  });

  it("waits when the page already has writing or blocks", () => {
    expect(
      canWriteSkeleton({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }],
      }),
    ).toBe(false);
    expect(
      canWriteSkeleton({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "image", attrs: {} }] },
        ],
      }),
    ).toBe(false);
    expect(
      canWriteSkeleton({ type: "doc", content: [{ type: "heading" }] }),
    ).toBe(false);
  });
});

describe("skeletonContent", () => {
  it("keeps the page's title, and leaves it empty when there is none", () => {
    expect(skeletonContent("Notes").content?.[0].content?.[0].text).toBe(
      "Notes",
    );
    expect(skeletonContent("").content?.[0].content).toEqual([]);
  });
});
