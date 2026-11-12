import { describe, expect, it } from "vitest";
import {
  canWriteSkeleton,
  holdsOnlySkeleton,
  isBlankDoc,
  skeletonContent,
  withTitle,
  type DocLike,
  type NodeLike,
} from "./first-version";

// A database's own page lost its block, or showed it twice: the skeleton
// written for a page created on this device raced the server's seeding.

const doc = (...names: { name: string; size?: number; text?: string }[]) => {
  const nodes: NodeLike[] = names.map((n) => ({
    type: { name: n.name },
    content: { size: n.size ?? (n.text ? n.text.length : 0) },
    textContent: n.text ?? "",
  }));
  const value: DocLike = {
    childCount: nodes.length,
    firstChild: nodes[0] ?? null,
    forEach: (f) => nodes.forEach((n) => f(n)),
  };
  return value;
};

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


describe("holdsOnlySkeleton", () => {
  it("is the server's skeleton for a page it couldn't read", () => {
    expect(holdsOnlySkeleton(doc())).toBe(true);
    expect(holdsOnlySkeleton(doc({ name: "paragraph" }))).toBe(true);
    expect(
      holdsOnlySkeleton(doc({ name: "title" }, { name: "paragraph" })),
    ).toBe(true);
    // A title typed into it is still a skeleton: the text is kept.
    expect(
      holdsOnlySkeleton(
        doc({ name: "title", text: "New Form" }, { name: "paragraph" }),
      ),
    ).toBe(true);
  });

  it("isn't, once the page has anything of its own", () => {
    expect(
      holdsOnlySkeleton(doc({ name: "title" }, { name: "database" })),
    ).toBe(false);
    expect(
      holdsOnlySkeleton(
        doc({ name: "title" }, { name: "paragraph", text: "hi" }),
      ),
    ).toBe(false);
  });
});

describe("withTitle", () => {
  const content = {
    type: "doc",
    content: [
      { type: "title", content: [{ type: "text", text: "New Form" }] },
      { type: "database", attrs: { sourceId: "s1" } },
    ],
  };

  it("keeps a title typed while the content was on its way", () => {
    const next = withTitle(content, "Renamed");
    expect(next.content?.[0].content?.[0].text).toBe("Renamed");
    expect(next.content?.[1]).toEqual(content.content[1]);
  });

  it("empties the title when there is none, and leaves other content be", () => {
    expect(withTitle(content, "").content?.[0].content).toEqual([]);
    const noTitle = { type: "doc", content: [{ type: "paragraph" }] };
    expect(withTitle(noTitle, "x")).toBe(noTitle);
  });
});
