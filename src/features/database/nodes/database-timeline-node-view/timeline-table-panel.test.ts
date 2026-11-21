import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { el, loadStylesheets, resolve } from "src/test/css-cascade";
import {
  GROUP_ROW_GAP,
  GROUP_ROW_HEIGHT,
  HEADER_HEIGHT,
  ROW_HEIGHT,
  TOTAL_HEADER_HEIGHT,
  rowTop,
} from "../../hooks/use-timeline-layout";

// The two panels are read across: a record's row on the left and its bar on
// the right have to sit on the same line. Nothing lays them out together —
// the row is a grid row in the panel, the bar is absolutely placed in the
// gantt — so they agree only as long as they start at the same y and step by
// the same amount. Both of those are one declaration each, and both were
// wrong: the header was 56px against a 61px header opposite it, and a row's
// separator line sat under its 34px instead of inside it, so every row drifted
// another pixel from its bar.

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "../../../..");

const rules = loadStylesheets(src, [
  "features/database/nodes/database-node/database-node.scss",
  "features/database/nodes/database-table-node/database-table-body.scss",
  "features/database/nodes/database-table-node/database-table-node-view.scss",
  "features/database/nodes/database-timeline-node-view/database-timeline-node-view.scss",
]);

const grid = el("db-node-grid db-tl-grid tag:div");
const record = el("react-renderer node-databaseRecord tag:div");
const header = el("db-header-row tag:div");

describe("where the panel's rows start", () => {
  it("counts the gap under the month row", () => {
    // The month row, the gap below it and the day row: all three stand
    // between the top of the grid and its first line.
    expect(TOTAL_HEADER_HEIGHT).toBe(
      GROUP_ROW_HEIGHT + GROUP_ROW_GAP + HEADER_HEIGHT,
    );
  });

  it("is taller than the two rows alone", () => {
    // The old number, and the reason the bars sat 5px above their rows.
    expect(TOTAL_HEADER_HEIGHT).toBeGreaterThan(
      GROUP_ROW_HEIGHT + HEADER_HEIGHT,
    );
  });

  it("takes its height from the gantt's, not from a number of its own", () => {
    // The node view measures the gantt's header and hands it down. A height
    // in px here would be a second copy of a number that lives opposite it.
    expect(resolve(rules, [grid, header], "height")?.value).toContain(
      "--tl-header-height",
    );
  });

  it("takes its separator line out of that height", () => {
    // What is measured is the distance to the first bar's top edge, the
    // gantt body's own line included. content-box would put this header's
    // line under that distance and push every row down a pixel.
    expect(resolve(rules, [grid, header], "box-sizing")?.value).toBe(
      "border-box",
    );
  });
});

describe("how tall the two panels are", () => {
  const layout = el("db-tl-layout tag:div");

  it("is as tall as its rows, not a number of its own", () => {
    // A fixed height left a timeline of one record sitting above most of
    // 460px of nothing.
    expect(resolve(rules, [layout], "height")).toBeNull();
  });

  it("stops growing somewhere", () => {
    expect(resolve(rules, [layout], "max-height")?.value).toBe("460px");
  });
});

describe("how wide the two panels are", () => {
  const toprow = el("db-tl-toprow tag:div");
  const viewport = el("db-tl-viewport tag:div");

  it("spends the width the database has on screen", () => {
    // --db-visible-width is the database's own width, from the sidebar's
    // edge out; --db-editor-width is the page's text column, which is
    // narrower.
    expect(resolve(rules, [toprow], "width")?.value).toContain(
      "--db-visible-width",
    );
  });

  it("gives the grid what the table leaves, not a width of its own", () => {
    // --db-editor-width here made the two panels together the page's width
    // PLUS the table's, which is what pushed the database past the window
    // and put a scrollbar under the whole page.
    expect(resolve(rules, [viewport], "width")?.value).toBe("auto");
  });

  it("leaves the database nothing to scroll sideways", () => {
    // The node keeps a scroller for a table wide enough to need one. A
    // timeline is built to the width it is given, so while one is on show
    // the node gives that room back. :has, so no other view is touched.
    const scoped = rules.filter((r) =>
      r.selector.includes(":has(.db-tl-layout-wrap)"),
    );
    expect(scoped.length).toBeGreaterThan(0);
    expect(scoped.some((r) => r.decls["overflow-x"]?.value === "hidden")).toBe(
      true,
    );
    expect(scoped.some((r) => r.decls["padding-right"]?.value === "0")).toBe(
      true,
    );
  });

  it("reaches back to where the sidebar ends", () => {
    // The node starts at the window's edge and holds its content over in
    // the page's column with padding. The sidebar covers the first
    // --sidebar-width of that, so keeping exactly that much puts the view
    // against the sidebar and gives the rest back.
    const scoped = rules.filter((r) =>
      r.selector.includes(":has(.db-tl-layout-wrap)"),
    );
    expect(
      scoped.some((r) =>
        r.decls["padding-left"]?.value.includes("--sidebar-width"),
      ),
    ).toBe(true);
  });

  it("leaves the title and toolbar in the page's column", () => {
    // Only the body reaches back. The head reads as part of the page, so
    // it is put back by the distance the body gave up.
    const scoped = rules.filter((r) =>
      r.selector.includes(":has(.db-tl-layout-wrap)"),
    );
    const head = scoped.filter((r) => r.selector.includes(".db-sticky-left"));
    expect(head.length).toBeGreaterThan(0);
    expect(
      head.some((r) =>
        r.decls["margin-left"]?.value.includes("--db-column-inset"),
      ),
    ).toBe(true);
  });

  it("keeps the timeframe controls on the page, not on the window", () => {
    // The grid runs to the edge of the screen; controls pinned to the end
    // of it end up under a scrollbar or off the screen. They stop where
    // the page's content does, level with the toolbar above them — which
    // is now a padding, the box itself reaching the window's edge so that
    // a month heading cannot reappear in the gap past the controls.
    const overlay = [el("db-tl-nav-overlay tag:div")];
    expect(resolve(rules, overlay, "right")?.value).toBe("0");
    expect(resolve(rules, overlay, "padding-right")?.value).toContain(
      "--db-column-inset-right",
    );
  });

  it("does not move the node itself", () => {
    // The node is already where it should be: full width, from the
    // window's left edge. Several attempts at this moved its margin
    // instead and nothing happened, because its margin was never what
    // indented it — its padding is (use-database-align.ts).
    //
    // Only rules that end at the node: the ones for what is inside it set
    // margins of their own, which is a different matter.
    const itself = rules.filter((r) =>
      r.selector
        .split(",")
        .some((s) => s.trim().endsWith(":has(.db-tl-layout-wrap)")),
    );
    expect(itself.length).toBeGreaterThan(0);
    expect(itself.some((r) => r.decls["margin-left"])).toBe(false);
  });
});

describe("how the panel's rows step", () => {
  it("takes a row's separator line out of its height", () => {
    // border-box: 34px including the line. content-box makes the row 35px
    // and the panel drifts a pixel per record away from the grid.
    expect(resolve(rules, [grid, record], "box-sizing")?.value).toBe(
      "border-box",
    );
  });

  it("is the height a bar is placed by", () => {
    expect(resolve(rules, [grid, record], "height")?.value).toBe(
      `${ROW_HEIGHT}px`,
    );
    expect(rowTop(1) - rowTop(0)).toBe(ROW_HEIGHT);
  });
});

describe("what makes the panel read as a table", () => {
  const cell = el("db-node-cell tag:div");

  it("lets a row's separator show", () => {
    // The row is 34px with its line inside (border-box). A cell that still
    // asks for 34px of its own paints its background over that line, and
    // the panel loses the rules between its rows.
    expect(resolve(rules, [grid, cell], "min-height")?.value).toBe("0");
  });

  it("draws one itself", () => {
    // Not borrowed from another stylesheet: the line is what makes this
    // read as a table, and a sheet that does not draw it cannot lose it.
    const own = rules.filter((r) =>
      r.selector.includes(".db-tl-grid.db-node-grid"),
    );
    expect(
      own.some((r) =>
        r.decls["border-bottom"]?.value.includes("--tt-border-color"),
      ),
    ).toBe(true);
    expect(resolve(rules, [grid, record], "border-bottom")?.value).toContain(
      "--tt-border-color",
    );
  });
});
