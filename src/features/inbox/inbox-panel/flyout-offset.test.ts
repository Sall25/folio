import { describe, it, expect } from "vitest";
import { FLYOUT_GAP, flyoutSideOffset } from "./flyout-offset";

describe("flyoutSideOffset", () => {
  it("adds whatever lies between the row and the panel's edge", () => {
    // The bug: row ends at 261, panel at 275 (the list's 8px padding and a
    // little more), so a plain 10px offset put the card 2px INSIDE the panel.
    expect(flyoutSideOffset(261, 275)).toBe(14 + FLYOUT_GAP);
  });

  it("leaves the full gap past the panel's edge", () => {
    const rowRight = 261;
    const panelRight = 275;
    const cardLeft = rowRight + flyoutSideOffset(rowRight, panelRight);
    expect(cardLeft - panelRight).toBe(FLYOUT_GAP);
  });

  it("holds the gap when the list grows a scrollbar", () => {
    // A scrollbar pulls the rows further from the panel's edge; the card must
    // move with them, not sit under the scrollbar.
    const noBar = flyoutSideOffset(261, 275);
    const withBar = flyoutSideOffset(261 - 15, 275);
    expect(withBar).toBe(noBar + 15);
  });

  it("holds the gap when the sidebar is resized", () => {
    // Both edges move together: the offset doesn't change.
    expect(flyoutSideOffset(461, 475)).toBe(flyoutSideOffset(261, 275));
  });

  it("falls back to the plain gap when the row is as wide as its panel", () => {
    expect(flyoutSideOffset(275, 275)).toBe(FLYOUT_GAP);
  });

  it("never pulls the card back over the row", () => {
    // A row measured wider than its panel (mid-layout, or a stale rect).
    expect(flyoutSideOffset(400, 275)).toBe(FLYOUT_GAP);
  });

  it("falls back to the plain gap on an unmeasured element", () => {
    expect(flyoutSideOffset(NaN, 275)).toBe(FLYOUT_GAP);
    expect(flyoutSideOffset(261, NaN)).toBe(FLYOUT_GAP);
  });

  it("takes a custom gap", () => {
    expect(flyoutSideOffset(261, 275, 20)).toBe(14 + 20);
  });
});
