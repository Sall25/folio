import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { dedupeOwnDatabases, restoreOwnDatabases } from "./dedupe-databases";

// A database's page showed its block twice (a form's page: two identical
// Responses tables). These check the cleanup takes out only the extras.

function makeDoc(
  blocks: { type: string; sourceId?: string; isLinked?: boolean }[],
) {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("default");
  fragment.insert(
    0,
    blocks.map((b) => {
      const el = new Y.XmlElement(b.type);
      if (b.sourceId) el.setAttribute("sourceId", b.sourceId);
      if (b.isLinked != null) {
        el.setAttribute("isLinked", b.isLinked as unknown as string);
      }
      return el;
    }),
  );
  return doc;
}

const types = (doc: Y.Doc) =>
  doc
    .getXmlFragment("default")
    .toArray()
    .map((c) => (c as Y.XmlElement).nodeName);

describe("dedupeOwnDatabases", () => {
  it("keeps one block of the page's own database", () => {
    const doc = makeDoc([
      { type: "title" },
      { type: "database", sourceId: "s1" },
      { type: "database", sourceId: "s1" },
      { type: "paragraph" },
    ]);
    expect(dedupeOwnDatabases(doc, new Set(["s1"]))).toBe(1);
    expect(types(doc)).toEqual(["title", "database", "paragraph"]);
  });

  it("removes every extra copy, keeping the first", () => {
    const doc = makeDoc([
      { type: "title" },
      { type: "database", sourceId: "s1" },
      { type: "paragraph" },
      { type: "database", sourceId: "s1" },
      { type: "database", sourceId: "s1" },
    ]);
    expect(dedupeOwnDatabases(doc, new Set(["s1"]))).toBe(2);
    expect(types(doc)).toEqual(["title", "database", "paragraph"]);
  });

  it("leaves other databases and linked blocks alone", () => {
    const doc = makeDoc([
      { type: "title" },
      { type: "database", sourceId: "s1" },
      { type: "database", sourceId: "s1", isLinked: true },
      { type: "database", sourceId: "other" },
      { type: "database", sourceId: "other" },
    ]);
    expect(dedupeOwnDatabases(doc, new Set(["s1"]))).toBe(0);
    expect(types(doc)).toHaveLength(5);
  });

  it("does nothing on an ordinary page", () => {
    const doc = makeDoc([
      { type: "title" },
      { type: "database", sourceId: "s1" },
      { type: "database", sourceId: "s1" },
    ]);
    expect(dedupeOwnDatabases(doc, new Set())).toBe(0);
    expect(types(doc)).toHaveLength(3);
  });

  it("reaches other copies of the doc as a normal edit", () => {
    const server = makeDoc([
      { type: "title" },
      { type: "database", sourceId: "s1" },
      { type: "database", sourceId: "s1" },
    ]);
    const client = new Y.Doc();
    Y.applyUpdate(client, Y.encodeStateAsUpdate(server));
    dedupeOwnDatabases(server, new Set(["s1"]));
    Y.applyUpdate(client, Y.encodeStateAsUpdate(server));
    expect(types(client)).toEqual(["title", "database"]);
  });
});


// The other half: a page whose block went missing, because a client wrote
// its own first version before the server could seed the page's content.

const pageContent = (sourceId: string) => ({
  type: "doc",
  content: [
    { type: "title", content: [{ type: "text", text: "New Form" }] },
    {
      type: "database",
      attrs: { id: "db1", sourceId, views: [{ id: "v1", type: "form" }] },
    },
  ],
});

describe("restoreOwnDatabases", () => {
  it("puts back the block a client's first version replaced", () => {
    const doc = makeDoc([{ type: "title" }, { type: "paragraph" }]);
    expect(
      restoreOwnDatabases(doc, new Set(["s1"]), pageContent("s1")),
    ).toBe(1);
    // Right after the title: no empty line between them.
    expect(types(doc)).toEqual(["title", "database", "paragraph"]);
    const el = doc.getXmlFragment("default").get(1) as Y.XmlElement;
    expect(el.getAttribute("sourceId")).toBe("s1");
    expect(el.getAttribute("views")).toEqual([{ id: "v1", type: "form" }]);
  });

  it("does nothing when the block is there", () => {
    const doc = makeDoc([
      { type: "title" },
      { type: "database", sourceId: "s1" },
    ]);
    expect(restoreOwnDatabases(doc, new Set(["s1"]), pageContent("s1"))).toBe(
      0,
    );
  });

  it("leaves an empty document to be seeded the usual way", () => {
    const doc = makeDoc([]);
    expect(restoreOwnDatabases(doc, new Set(["s1"]), pageContent("s1"))).toBe(
      0,
    );
    expect(types(doc)).toEqual([]);
  });

  it("adds nothing it can't find in the page's content", () => {
    const doc = makeDoc([{ type: "title" }]);
    expect(restoreOwnDatabases(doc, new Set(["s1"]), pageContent("other"))).toBe(
      0,
    );
    expect(restoreOwnDatabases(doc, new Set(["s1"]), null)).toBe(0);
    expect(restoreOwnDatabases(doc, new Set(), pageContent("s1"))).toBe(0);
  });

  it("reaches other copies of the doc as a normal edit", () => {
    const server = makeDoc([{ type: "title" }, { type: "paragraph" }]);
    const client = new Y.Doc();
    Y.applyUpdate(client, Y.encodeStateAsUpdate(server));
    restoreOwnDatabases(server, new Set(["s1"]), pageContent("s1"));
    Y.applyUpdate(client, Y.encodeStateAsUpdate(server));
    expect(types(client)).toEqual(["title", "database", "paragraph"]);
  });
});
