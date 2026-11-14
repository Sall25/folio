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
