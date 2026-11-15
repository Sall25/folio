import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Schema, type Node } from "@tiptap/pm/model";
import {
  defaultRules,
  normalizeNestedOptions,
  type DragHandleRule,
} from "@tiptap/extension-drag-handle";
import { makeNestedOptions } from "./drag-handle-rules";

// Guards for the drag handle. Every case here was fixed once and later lost
// when the file was rewritten from an old copy. Runs with `npm test`, before
// every commit (.githooks/pre-commit) and in CI. If one fails, the change
// undoes an earlier fix: restore it, don't edit the test to match.

// ── A small schema with the app's node names ────────────────────────────
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
    paragraph: { group: "block", content: "inline*" },
    heading: { group: "block", content: "inline*" },
    codeBlock: { group: "block", content: "text*", code: true },
    image: { group: "block", atom: true },
    callout: { group: "block", content: "block+" },
    blockquote: { group: "block", content: "block+" },
    appendix: { group: "block", content: "appendixSummary appendixContent" },
    appendixSummary: { content: "inline*" },
    appendixContent: { content: "block+" },
    bulletList: { group: "block", content: "listItem+" },
    listItem: { content: "paragraph block*" },
    columnBlock: { group: "block", content: "column+" },
    column: { content: "block+" },
    database: {
      group: "block",
      content: "databaseRecord*",
      attrs: { databaseId: { default: null } },
    },
    databaseRecord: {
      content: "databaseCell*",
      attrs: { databaseId: { default: null } },
    },
    databaseCell: { content: "inline*" },
  },
});

const t = (s = "x") => schema.text(s);
const p = (s?: string) => schema.node("paragraph", null, [t(s)]);
const h = (s?: string) => schema.node("heading", null, [t(s)]);
const n = (name: string, ...content: Node[]) =>
  schema.node(name, null, content);
const toggle = (...body: Node[]) =>
  n(
    "appendix",
    n("appendixSummary", t("title")),
    n("appendixContent", ...body),
  );
// No view data in these tests (no editor): rows count as table rows.
const db = (cell: string) =>
  schema.node("database", { databaseId: "db1" }, [
    schema.node("databaseRecord", { databaseId: "db1" }, [
      schema.node("databaseCell", null, [t(cell)]),
    ]),
  ]);

// ── The handle library's target search (3.19), without a browser ────────
// Same scoring as findBestDragTarget in @tiptap/extension-drag-handle:
// 1000 minus each rule's penalty (≤ 0 = never), minus the edge deduction
// (strength × depth) for blocks the pointer is past the left edge of;
// highest score wins, the deeper block on a tie.
const options = normalizeNestedOptions(makeNestedOptions(null));
const rules: DragHandleRule[] = [
  ...(options.defaultRules ? defaultRules : []),
  ...options.rules,
];

// An editor that knows one database, showing one kind of view. Enough for
// the rules: they ask what view a record belongs to and nothing else.
function editorShowing(viewType: string) {
  return {
    storage: {
      database: {
        entries: new Map([["db1", { data: { view: { type: viewType } } }]]),
      },
    },
  } as unknown as Parameters<typeof makeNestedOptions>[0];
}

function rulesFor(viewType: string): DragHandleRule[] {
  const opts = normalizeNestedOptions(
    makeNestedOptions(editorShowing(viewType)),
  );
  return [...(opts.defaultRules ? defaultRules : []), ...opts.rules];
}

type Pick = { name: string; depth: number; text: string } | null;

function targetAt(
  doc: Node,
  pos: number,
  nearEdge: (depth: number) => boolean = () => false,
  ruleSet: DragHandleRule[] = rules,
): Pick {
  const $pos = doc.resolve(pos);
  let best: { node: Node; depth: number; score: number } | null = null;
  for (let depth = $pos.depth; depth >= 1; depth--) {
    const node = $pos.node(depth);
    const parent = $pos.node(depth - 1);
    const index = $pos.index(depth - 1);
    let score = 1000;
    let out = false;
    for (const rule of ruleSet) {
      score -= rule.evaluate({
        node,
        pos: $pos.before(depth),
        depth,
        parent,
        index,
        isFirst: index === 0,
        isLast: index === parent.childCount - 1,
        $pos,
        view: null as never,
      });
      if (score <= 0) {
        out = true;
        break;
      }
    }
    if (out) continue;
    if (nearEdge(depth)) score -= options.edgeDetection.strength * depth;
    if (score <= 0) continue;
    if (!best || score > best.score) best = { node, depth, score };
  }
  return best
    ? {
        name: best.node.type.name,
        depth: best.depth,
        text: best.node.textContent,
      }
    : null;
}

/** Position inside the first text node containing `needle`. */
function posOf(doc: Node, needle: string): number {
  let found = -1;
  doc.descendants((node, pos) => {
    if (found >= 0) return false;
    if (node.isText && node.text?.includes(needle)) {
      found = pos + node.text.indexOf(needle) + 1;
      return false;
    }
    return true;
  });
  if (found < 0) throw new Error(`no text "${needle}"`);
  return found;
}

describe("drag handle: which block gets the handle", () => {
  it("a top-level paragraph", () => {
    const doc = n("doc", p("hello"));
    expect(targetAt(doc, posOf(doc, "hello"))?.name).toBe("paragraph");
  });

  it("toggle (c2a7f859): a block inside its body keeps its own handle", () => {
    const doc = n("doc", toggle(p("first"), p("inner")));
    expect(targetAt(doc, posOf(doc, "inner"))).toMatchObject({
      name: "paragraph",
      text: "inner",
    });
  });

  it("toggle (c2a7f859): still the inner block when the pointer moves left onto the handle", () => {
    const doc = n("doc", toggle(p("first"), p("inner")));
    // On the handle, in the margin: the pointer is left of every block,
    // the toggle included. Without the fix every candidate drops out and
    // the handle vanishes.
    const pick = targetAt(doc, posOf(doc, "inner"), () => true);
    expect(pick).toMatchObject({ name: "paragraph", text: "inner" });
  });

  it("toggle (c2a7f859): nested toggles — the innermost block wins", () => {
    const doc = n("doc", toggle(p("a"), toggle(p("b"), p("deep"))));
    expect(targetAt(doc, posOf(doc, "deep"), () => true)).toMatchObject({
      name: "paragraph",
      text: "deep",
    });
  });

  it("toggle: its title is the toggle, never the title line alone", () => {
    const doc = n("doc", toggle(p("body")));
    expect(targetAt(doc, posOf(doc, "title"))?.name).toBe("appendix");
  });

  it("callout: its first paragraph is the callout", () => {
    const doc = n("doc", n("callout", p("lead"), p("second")));
    expect(targetAt(doc, posOf(doc, "lead"))?.name).toBe("callout");
  });

  it("callout (84661d66): a first heading is the callout too", () => {
    const doc = n("doc", n("callout", h("Heading"), p("second")));
    expect(targetAt(doc, posOf(doc, "Heading"))?.name).toBe("callout");
  });

  it("callout (75258ed3): its other blocks get their own handle", () => {
    const doc = n("doc", n("callout", p("lead"), p("second")));
    expect(targetAt(doc, posOf(doc, "second"))).toMatchObject({
      name: "paragraph",
      text: "second",
    });
  });

  it("callout: a toggle at the top keeps its blocks' handles", () => {
    const doc = n("doc", n("callout", toggle(p("inside"))));
    expect(targetAt(doc, posOf(doc, "inside"))).toMatchObject({
      name: "paragraph",
      text: "inside",
    });
  });

  it("callout: a toggle at the top — its title is the callout (any first block is)", () => {
    const doc = n("doc", n("callout", toggle(p("inside")), p("after")));
    expect(targetAt(doc, posOf(doc, "title"))?.name).toBe("callout");
  });

  it("callout: a toggle at the top keeps its blocks' handles when the pointer moves left", () => {
    const doc = n("doc", n("callout", toggle(p("inside")), p("after")));
    expect(targetAt(doc, posOf(doc, "inside"), () => true)).toMatchObject({
      name: "paragraph",
      text: "inside",
    });
  });

  it("callout: a list at the top keeps its items' handles", () => {
    const doc = n(
      "doc",
      n("callout", n("bulletList", n("listItem", p("item")))),
    );
    expect(targetAt(doc, posOf(doc, "item"))?.name).toBe("listItem");
  });

  it("callout (e50e999c): a database at the top keeps its rows' handles", () => {
    const doc = n("doc", n("callout", db("cell"), p("after")));
    expect(targetAt(doc, posOf(doc, "cell"))?.name).toBe("databaseRecord");
  });

  it("database: a row gets the handle, not the cell or the database", () => {
    const doc = n("doc", db("row"));
    expect(targetAt(doc, posOf(doc, "row"))?.name).toBe("databaseRecord");
  });

  it("callout inside a column: first line is the callout, not the column", () => {
    const doc = n(
      "doc",
      n(
        "columnBlock",
        n("column", n("callout", h("Title"))),
        n("column", p("right")),
      ),
    );
    expect(targetAt(doc, posOf(doc, "Title"))?.name).toBe("callout");
  });

  it("list: an item's first line is the item, never the whole list", () => {
    const doc = n(
      "doc",
      n("bulletList", n("listItem", p("one")), n("listItem", p("two"))),
    );
    expect(targetAt(doc, posOf(doc, "two"))).toMatchObject({
      name: "listItem",
      text: "two",
    });
  });

  it("columns: a block in a column, never the column or the column block", () => {
    const doc = n(
      "doc",
      n("columnBlock", n("column", p("left")), n("column", p("right"))),
    );
    expect(targetAt(doc, posOf(doc, "right"))).toMatchObject({
      name: "paragraph",
      text: "right",
    });
  });

  it("quote: moves as one block", () => {
    const doc = n("doc", n("blockquote", p("quoted"), p("more")));
    expect(targetAt(doc, posOf(doc, "more"))?.name).toBe("blockquote");
  });
});

// ── Pieces of the component that were lost once ─────────────────────────
// They need a browser to test for real; until then, make sure they're
// still there. Each names the commit that added it.
describe("drag handle: component pieces still in place", () => {
  const src = readFileSync(resolve(__dirname, "drag-handle.tsx"), "utf8");

  it("rules come from drag-handle-rules.ts (not an inline copy)", () => {
    expect(src).toContain('from "./drag-handle-rules"');
    expect(src).not.toMatch(/function basePenalty|const makeNestedOptions/);
  });

  it("75258ed3: grip beside the text in toggles and callouts", () => {
    expect(src).toContain("borderLeftWidth");
    expect(src).toContain('closest(".appendix-content")');
    expect(src).toContain('closest(".callout-content")');
  });

  it("33f3d2ce: handle placed again after an upward box selection", () => {
    expect(src).toMatch(/addEventListener\("mouseup", onUp/);
  });

  it("d4cf1c90: callout icon picker host is mounted", () => {
    expect(src).toContain("<NodeIconPickerHost editor={editor} />");
  });

  it("e257701c: top-level atoms (Pomodoro, page links) get the handle", () => {
    expect(src).toContain("topLevelAtom");
  });

  // The handle library measures the editor's first and last blocks before
  // it looks for a block (clampToContent): a block with no box there
  // (display: none) means no handle at all on the page. ef85f541 hid the
  // old trailing line under a database page that way.
  it("database page: the hidden trailing line keeps a box", () => {
    const scss = readFileSync(
      resolve(
        __dirname,
        "../../../features/database/nodes/database-node/database-node.scss",
      ),
      "utf8",
    );
    const start = scss.indexOf(".tiptap.ProseMirror.is-database-page");
    expect(start).toBeGreaterThan(-1);
    const rule = scss.slice(start, scss.indexOf("}", start));
    expect(rule).toContain("ProseMirror-trailingBreak");
    expect(rule).not.toMatch(/display:\s*none/);
  });
});

// ── Which views hand their rows to the drag handle ─────────────────────
// A record is a row in a table, a list and a timeline — in the last, the
// row in the table beside the grid, which is where the bar is drawn from.
// In a board, a gallery or a calendar a record is a card with its own
// controls, and the handle belongs to the database instead.

describe("records that are rows", () => {
  const doc = n("doc", db("row"));
  const pick = (viewType: string) =>
    targetAt(doc, posOf(doc, "row"), () => false, rulesFor(viewType))?.name;

  it("gives the handle to a table's rows", () => {
    expect(pick("table")).toBe("databaseRecord");
  });

  it("gives the handle to a list's rows", () => {
    expect(pick("list")).toBe("databaseRecord");
  });

  it("gives the handle to a timeline's rows", () => {
    // Its panel is a table view: the same rows, the same drop target.
    expect(pick("timeline")).toBe("databaseRecord");
  });

  it("keeps the handle on the database in a board or a gallery", () => {
    expect(pick("board")).toBe("database");
    expect(pick("gallery")).toBe("database");
    expect(pick("calendar")).toBe("database");
  });
});

describe("a row at the window's left edge", () => {
  // The edge rule takes strength x depth off a candidate as the pointer
  // nears a left edge, and a row is deeper than its database, so it loses
  // more. A timeline's table starts at the sidebar's edge, which is the
  // window's left edge once the sidebar is collapsed, so this fires on an
  // ordinary hover there and the handle used to jump out to the database.
  const doc = n("doc", db("row"));
  const atEdge = (viewType: string) =>
    targetAt(doc, posOf(doc, "row"), () => true, rulesFor(viewType))?.name;

  it.each(["table", "list", "timeline"])(
    "keeps the handle on a %s's row",
    (viewType) => {
      expect(atEdge(viewType)).toBe("databaseRecord");
    },
  );

  it("still keeps it on the database for a board", () => {
    expect(atEdge("board")).toBe("database");
  });
});
