import { describe, expect, it } from "vitest";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  anchor,
  boundsOf,
  clampZoom,
  draftPath,
  edgePath,
  fitView,
  nearestSide,
  oppositeSide,
  placeNew,
  snap,
  toCanvas,
  zoomAt,
  type Rect,
} from "./canvas-geometry";

const block: Rect = { x: 100, y: 100, w: 200, h: 80 };
const pad = { top: 74, right: 46, bottom: 72, left: 46 };

describe("anchors", () => {
  it("meets each side at its middle", () => {
    expect(anchor(block, "left")).toEqual({ x: 100, y: 140 });
    expect(anchor(block, "right")).toEqual({ x: 300, y: 140 });
    expect(anchor(block, "top")).toEqual({ x: 200, y: 100 });
    expect(anchor(block, "bottom")).toEqual({ x: 200, y: 180 });
  });

  it("pairs each side with its opposite", () => {
    expect(oppositeSide("left")).toBe("right");
    expect(oppositeSide("top")).toBe("bottom");
    expect(oppositeSide(oppositeSide("right"))).toBe("right");
  });
});

describe("nearestSide", () => {
  it("picks the side the pointer is on", () => {
    expect(nearestSide(block, { x: 320, y: 140 })).toBe("right");
    expect(nearestSide(block, { x: 80, y: 140 })).toBe("left");
    expect(nearestSide(block, { x: 200, y: 60 })).toBe("top");
    expect(nearestSide(block, { x: 200, y: 220 })).toBe("bottom");
  });

  it("measures in widths, not pixels, so a wide block keeps its top", () => {
    // 40px above a 600×60 block: closer to the left edge in pixels, but
    // plainly the top of the block to anyone looking at it.
    const wide: Rect = { x: 0, y: 0, w: 600, h: 60 };
    expect(nearestSide(wide, { x: 260, y: -40 })).toBe("top");
  });

  it("survives a block with no measured size", () => {
    expect(nearestSide({ x: 0, y: 0, w: 0, h: 0 }, { x: 5, y: 0 })).toBe(
      "right",
    );
  });
});

describe("edge paths", () => {
  it("starts at one anchor and ends at the other", () => {
    const b: Rect = { x: 500, y: 300, w: 200, h: 80 };
    const d = edgePath(block, "right", b, "left");
    expect(d.startsWith("M300,140 ")).toBe(true);
    expect(d.endsWith(" 500,340")).toBe(true);
  });

  it("leaves each block perpendicular to its own side", () => {
    const b: Rect = { x: 500, y: 300, w: 200, h: 80 };
    const m = /C([-\d.]+),([-\d.]+) ([-\d.]+),([-\d.]+)/.exec(
      edgePath(block, "right", b, "left"),
    );
    expect(m).not.toBeNull();
    const [c1x, c1y, c2x, c2y] = m!.slice(1).map(Number);
    // A "right" anchor pushes its control point to the right, at the same
    // height; a "left" anchor pushes left.
    expect(c1x).toBeGreaterThan(300);
    expect(c1y).toBe(140);
    expect(c2x).toBeLessThan(500);
    expect(c2y).toBe(340);
  });

  it("draws a draft edge to the pointer", () => {
    const d = draftPath(block, "right", { x: 420, y: 90 });
    expect(d.startsWith("M300,140 ")).toBe(true);
    expect(d.endsWith(" 420,90")).toBe(true);
  });
});

describe("the two coordinate spaces", () => {
  const frame = { left: 50, top: 20 };

  it("undoes the pan and the zoom", () => {
    const v = { x: 30, y: 10, k: 2 };
    expect(toCanvas({ x: 50 + 30 + 200, y: 20 + 10 + 160 }, frame, v)).toEqual({
      x: 100,
      y: 80,
    });
  });

  it("is the identity at rest", () => {
    expect(toCanvas({ x: 150, y: 120 }, frame, { x: 0, y: 0, k: 1 })).toEqual({
      x: 100,
      y: 100,
    });
  });
});

describe("zoomAt", () => {
  it("keeps the point under the pointer still", () => {
    const v = { x: 0, y: 0, k: 1 };
    const at = { x: 400, y: 200 };
    const before = toCanvas(
      { x: at.x, y: at.y },
      { left: 0, top: 0 },
      v,
    );
    const after = toCanvas(
      { x: at.x, y: at.y },
      { left: 0, top: 0 },
      zoomAt(v, at, 1.25),
    );
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });

  it("stops at the limits", () => {
    let v = { x: 0, y: 0, k: 1 };
    for (let i = 0; i < 40; i += 1) v = zoomAt(v, { x: 10, y: 10 }, 1.2);
    expect(v.k).toBe(MAX_ZOOM);
    for (let i = 0; i < 80; i += 1) v = zoomAt(v, { x: 10, y: 10 }, 1 / 1.2);
    expect(v.k).toBe(MIN_ZOOM);
  });

  it("clamps on its own too", () => {
    expect(clampZoom(9)).toBe(MAX_ZOOM);
    expect(clampZoom(0.01)).toBe(MIN_ZOOM);
    expect(clampZoom(1)).toBe(1);
  });
});

describe("bounds and fit", () => {
  const rects: Rect[] = [
    { x: 0, y: 0, w: 200, h: 100 },
    { x: 400, y: 260, w: 200, h: 100 },
  ];

  it("boxes every block", () => {
    expect(boundsOf(rects)).toEqual({ x: 0, y: 0, w: 600, h: 360 });
  });

  it("has a sane box with no blocks at all", () => {
    expect(boundsOf([])).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it("leaves every block clear of the floating toolbars", () => {
    const frame = { w: 900, h: 520 };
    const v = fitView(rects, frame, pad);
    for (const r of rects) {
      const left = r.x * v.k + v.x;
      const top = r.y * v.k + v.y;
      expect(left).toBeGreaterThanOrEqual(pad.left - 0.01);
      expect(top).toBeGreaterThanOrEqual(pad.top - 0.01);
      expect(left + r.w * v.k).toBeLessThanOrEqual(frame.w - pad.right + 0.01);
      expect(top + r.h * v.k).toBeLessThanOrEqual(frame.h - pad.bottom + 0.01);
    }
  });

  it("never zooms past 1 to fill the frame", () => {
    const v = fitView([{ x: 0, y: 0, w: 60, h: 40 }], { w: 900, h: 520 }, pad);
    expect(v.k).toBe(1);
  });

  it("zooms out for a map bigger than the frame", () => {
    const v = fitView(
      [{ x: 0, y: 0, w: 3000, h: 2000 }],
      { w: 900, h: 520 },
      pad,
    );
    expect(v.k).toBeLessThan(1);
    expect(v.k).toBeGreaterThanOrEqual(MIN_ZOOM);
  });

  it("copes with an empty canvas", () => {
    const v = fitView([], { w: 900, h: 520 }, pad);
    expect(Number.isFinite(v.x)).toBe(true);
    expect(Number.isFinite(v.y)).toBe(true);
    expect(v.k).toBe(1);
  });
});

describe("placing a block that arrives without a position", () => {
  it("starts near the top left", () => {
    expect(placeNew([], 248)).toEqual({ x: 32, y: 32 });
  });

  it("cascades instead of stacking", () => {
    const first = placeNew([], 248);
    const second = placeNew([{ ...first, w: 248, h: 90 }], 248);
    expect(second).not.toEqual(first);
    expect(second.x).toBeGreaterThan(first.x);
    expect(second.y).toBeGreaterThan(first.y);
  });
});

describe("snap", () => {
  it("lands on the grid", () => {
    expect(snap(11)).toBe(8);
    expect(snap(13)).toBe(16);
    expect(snap(-3)).toBe(-0);
  });
});
