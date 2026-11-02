import { describe, expect, it } from "vitest";
import { insetsFor } from "./window-insets";

// A maximized window bigger than the work area (Windows, no system frame):
// how much to keep clear on each side, in CSS pixels.

describe("window insets", () => {
  const area = { x: 0, y: 0, width: 2400, height: 1290 }; // taskbar: 60px

  it("the part under the taskbar, at 125% scaling", () => {
    expect(
      insetsFor({ x: 0, y: 0, width: 2400, height: 1350 }, area, 1.25),
    ).toEqual({ top: 0, right: 0, bottom: 48, left: 0 });
  });

  it("an overhang on every side", () => {
    expect(
      insetsFor({ x: -8, y: -8, width: 2416, height: 1306 }, area, 1),
    ).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
  });

  it("nothing when the window fits", () => {
    expect(
      insetsFor({ x: 100, y: 50, width: 1200, height: 800 }, area, 1),
    ).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });
});
