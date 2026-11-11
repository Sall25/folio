import { describe, expect, it } from "vitest";
import { fitCard } from "./toc-card-fit";

describe("fitCard", () => {
  it("stays where it opens when it fits", () => {
    expect(
      fitCard({ openTop: 400, height: 200, viewportHeight: 900 }),
    ).toEqual({ offset: 0, maxHeight: 868 });
  });

  it("moves up just enough to clear the bottom edge", () => {
    // 400 + 600 would end at 1000, past 900 - 16.
    expect(
      fitCard({ openTop: 400, height: 600, viewportHeight: 900 }).offset,
    ).toBe(-116);
  });

  it("caps to the window and scrolls when taller than it", () => {
    const fit = fitCard({ openTop: 400, height: 2000, viewportHeight: 900 });
    expect(fit.maxHeight).toBe(868);
    expect(400 + fit.offset).toBe(16); // top at the margin
  });

  it("never goes above the top edge", () => {
    const fit = fitCard({ openTop: 10, height: 100, viewportHeight: 900 });
    expect(10 + fit.offset).toBe(16);
  });
});
