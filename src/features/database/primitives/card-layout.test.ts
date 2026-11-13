import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { el, loadStylesheets, resolve, type El } from "src/test/css-cascade";

// What a card looks like is CSS, and CSS went wrong here in ways no unit
// test would normally catch: a rule in one file zeroed the title's margin
// while the properties kept theirs (6px out of line), a rule of mine
// cancelled another of mine (same weight, later in the file), and cells
// that build their own element kept the table's 34px row inside a card.
//
// So this works the way the browser does: compile the stylesheets a card
// uses, then for a given element work out which declaration actually wins,
// by weight and then by order. The assertions are the things that must stay
// true for a card to read as one column of rows.

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "../../..");

// Every stylesheet that has a say in a card's boxes. A new one that styles
// cards belongs here too.
const SHEETS = [
  "features/database/components/cells/cell/cell.scss",
  "features/database/primitives/title-cell-display.scss",
  "features/database/primitives/person-cell-display.scss",
  "features/database/primitives/select-cell-display.scss",
  "features/database/primitives/status-cell-display.scss",
  "features/database/primitives/number-cell-display.scss",
  "features/database/primitives/checkbox-cell-display.scss",
  "features/database/primitives/cell-editor-popover.scss",
  "features/database/nodes/database-board-node-view/database-board-node-view.scss",
  "features/database/nodes/database-gallery-node-view/database-gallery-node-view.scss",
  "features/database/primitives/board-card-body.scss",
];

const rules = loadStylesheets(src, SHEETS);

// ── The card ──────────────────────────────────────────────────────────────

const card = el("db-board-card tag:div", { "data-view-type": "gallery" });
const title = el("db-board-card__title tag:div");
const props = el("db-board-card__props tag:div", { "data-layout": "list" });
/** A property row: most cells carry the card class… */
const row = el("db-cell db-cell-board-view tag:div");
/** …and a few (multi-select, formula, email, the time ones) don't. */
const plainRow = el("db-cell tag:div", { "data-wrap": "true" });

const titleChain = [card, title];
const propsChain = [card, props];
const rowChain = [card, props, row];
const plainRowChain = [card, props, plainRow];

describe("gallery card layout", () => {
  const get = (chain: El[], property: string) =>
    resolve(rules, chain, property)?.value ?? null;

  it("gives the title and the properties the same left inset", () => {
    // What went wrong: one of them had its margin zeroed and the other
    // kept 6px, so every property sat 6px right of the title.
    expect(get(titleChain, "padding-left")).toBe(
      get(propsChain, "padding-left"),
    );
    expect(get(titleChain, "margin-left")).toBe(get(propsChain, "margin-left"));
    expect(get(titleChain, "margin-left")).toBe("0");
    expect(get(titleChain, "padding-left")).toBe("var(--db-card-gutter)");
  });

  it("keeps that inset against the board grid's rule", () => {
    // The board's stylesheet zeroes the properties' padding for every card
    // in its grid, and the gallery uses the same grid class.
    const winner = resolve(rules, propsChain, "padding-left");
    expect(winner?.value).not.toBe("0");
  });

  it("gives every row the same height", () => {
    // A rule of mine once cancelled this one: same weight, later in the
    // file, so the rows fell back to their content's height.
    expect(get(rowChain, "min-height")).toBe("24px");
    expect(get(plainRowChain, "min-height")).toBe("24px");
  });

  it("never lets a cell keep the table's row inside a card", () => {
    expect(get(rowChain, "line-height")).toBe("1.4");
    expect(get(plainRowChain, "line-height")).toBe("1.4");
    expect(get(plainRowChain, "height")).toBe("fit-content");
  });

  it("drops the padding a wrapping cell keeps for the table", () => {
    // 6px top and bottom on that one property, which read as a gap.
    expect(get(plainRowChain, "padding-top")).toBe("0");
    expect(get(plainRowChain, "padding-bottom")).toBe("0");
  });

  it("starts every row at the card's gutter, not the cell's inset", () => {
    expect(get(rowChain, "padding-left")).toBe("0");
    expect(get(rowChain, "margin-left")).toBe("0");
  });
});
