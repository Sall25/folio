import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { el, loadStylesheets, resolve } from "src/test/css-cascade";

// A comment on a cell is only worth anything if you can see it. The mark
// nearly didn't survive its first day: the count beside it is a button, and
// a table stretches every child of a cell to the column's width
// (.db-node-cell--atom > * { width: 100% }), so the count's background was
// painted straight across the value it was meant to point at.
//
// These read the stylesheets the way the browser does — the table's own
// among them, stretching rule included — and check that the mark shows and
// that nothing standing in the cell can cover it.

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "../../../..");

// In the order the app loads them, so a tie goes the way it goes there.
const SHEETS = [
  "components/tiptap-ui-primitive/button/button.scss",
  "features/database/components/cells/cell/cell.scss",
  "features/database/nodes/database-node/database-node.scss",
  "features/database/primitives/text-cell-display.scss",
  "features/database/primitives/select-cell-display.scss",
  "features/database/primitives/status-cell-display.scss",
  "features/database/record-property-panel/record-property-panel.scss",
  "features/database/components/cell-comments/cell-comments.scss",
];

const rules = loadStylesheets(src, SHEETS);

// ── A commented cell in a table ───────────────────────────────────────────
// div.db-node-cell--atom
//   div.db-cell > button.tiptap-button > span.db-cell-text__display  ← value
//   span.db-cell-comments__anchor[data-count]
//   button.db-cell-comments__badge                                   ← count
const anchor = el("tag:span db-cell-comments__anchor", { "data-count": "1" });
const badge = el("tag:button db-cell-comments__badge");
const value = el("tag:span tiptap-button-text db-cell-text__display");
const button = el("tag:button tiptap-button", {}, [value]);
const inner = el("tag:div db-cell", {}, [button]);
const cell = el("tag:div db-node-cell db-node-cell--atom", {}, [
  inner,
  anchor,
  badge,
]);

const valueChain = [cell, inner, button, value];
const badgeChain = [cell, badge];
const anchorChain = [cell, anchor];

// ── The same value in the row's own page ──────────────────────────────────
const panelValue = el(
  "tag:span record-prop-panel__value record-prop-panel__value--text",
);
const panelWrapper = el("tag:div record-prop-panel__value-wrapper", {}, [
  panelValue,
  anchor,
  badge,
]);
const panelChain = [
  el("tag:div record-prop-panel__row"),
  panelWrapper,
  panelValue,
];

const get = (chain: ReturnType<typeof el>[], property: string) =>
  resolve(rules, chain, property)?.value ?? null;

/** Nothing you can see through: no colour at all, or a fully clear one. */
const seeThrough = (value: string | null) =>
  value === null ||
  value === "transparent" ||
  value === "none" ||
  /rgba\([^)]*,\s*0\s*\)/.test(value) ||
  /\/\s*0\s*\)/.test(value);

describe("the mark on a commented value", () => {
  it("is painted on the value", () => {
    expect(get(valueChain, "background-color")).toMatch(/color-mix|var\(/);
    expect(get(valueChain, "border-bottom-style")).toBe("solid");
    expect(
      parseFloat(get(valueChain, "border-bottom-width") ?? "0"),
    ).toBeGreaterThanOrEqual(2);
  });

  it("keeps the app's highlight colour, in both themes", () => {
    // The token carries a value per theme; a hex here would be wrong in one
    // of them.
    expect(get(valueChain, "background-color")).toContain(
      "--tt-color-highlight-yellow",
    );
    expect(get(valueChain, "border-bottom-color")).toContain(
      "--tt-color-highlight-yellow-contrast",
    );
  });

  it("hugs its own words, not the cell", () => {
    // The value's element is the button's text: it grows to the column and
    // stretches to the row unless it is told not to.
    expect(get(valueChain, "width")).toBe("fit-content");
    expect(get(valueChain, "height")).toBe("fit-content");
    expect(get(valueChain, "flex")).toBe("0 0 auto");
    expect(get(valueChain, "align-self")).toBe("center");
  });

  it("shows in the row's own page too", () => {
    expect(get(panelChain, "background-color")).toMatch(/color-mix|var\(/);
    expect(
      parseFloat(get(panelChain, "border-bottom-width") ?? "0"),
    ).toBeGreaterThanOrEqual(2);
  });
});

describe("nothing in the cell covers it", () => {
  it("the count carries no background of its own", () => {
    // What went wrong: an opaque background on a full-width button.
    expect(seeThrough(get(badgeChain, "background-color"))).toBe(true);
  });

  it("the count stays the width of its number", () => {
    // Against `.db-node-cell--atom > * { width: 100% }`, which made it as
    // wide as the column.
    expect(get(badgeChain, "width")).toBe("fit-content");
    expect(get(badgeChain, "left")).toBe("auto");
    expect(get(badgeChain, "position")).toBe("absolute");
  });

  it("the sheet that opens the popover stays invisible", () => {
    // It covers the whole cell by design: it must never paint or catch a
    // click meant for the value.
    expect(seeThrough(get(anchorChain, "background-color"))).toBe(true);
    expect(get(anchorChain, "pointer-events")).toBe("none");
  });

  it("every child standing over the cell is see-through", () => {
    // A collaborator adding one is the case this guards: anything placed in
    // a cell is stretched across it, so an opaque background would hide the
    // value under it.
    for (const child of [anchor, badge]) {
      expect(seeThrough(get([cell, child], "background-color"))).toBe(true);
    }
  });
});
