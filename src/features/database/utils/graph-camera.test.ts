import { describe, expect, it } from "vitest";
import {
  cameraTransform,
  frameAround,
  graphPointIn,
  pannedBy,
  viewScale,
  visibleRect,
  zoomedAbout,
  MAX_ZOOM,
  MIN_ZOOM,
  START_CAMERA,
} from "./graph-camera";

const BOX = { width: 1000, height: 600 };
// A canvas drawn at half its viewBox size, somewhere down the page.
const RECT = { left: 100, top: 50, width: 500, height: 300 };

describe("a point on screen, in the graph's coordinates", () => {
  it("is the middle of the box at the middle of the canvas", () => {
    expect(
      graphPointIn(RECT, BOX, START_CAMERA, { clientX: 350, clientY: 200 }),
    ).toEqual({ x: 500, y: 300 });
  });

  it("scales by the canvas's own size", () => {
    // Half as wide on screen as in its viewBox: a pixel is two.
    expect(
      graphPointIn(RECT, BOX, START_CAMERA, {
        clientX: 350 + 50,
        clientY: 200,
      }),
    ).toEqual({ x: 600, y: 300 });
  });

  it("undoes the zoom, so what is under the pointer is what is picked", () => {
    const zoomed = { ...START_CAMERA, zoom: 2 };
    expect(
      graphPointIn(RECT, BOX, zoomed, { clientX: 400, clientY: 200 }),
    ).toEqual({ x: 550, y: 300 });
  });

  it("follows the camera where it has moved to", () => {
    const moved = { x: 300, y: -40, zoom: 1 };
    expect(
      graphPointIn(RECT, BOX, moved, { clientX: 350, clientY: 200 }),
    ).toEqual({ x: 800, y: 260 });
  });

  it("says something sensible about a canvas with no size", () => {
    const none = { left: 0, top: 0, width: 0, height: 0 };
    expect(
      graphPointIn(none, BOX, START_CAMERA, { clientX: 5, clientY: 5 }),
    ).toEqual({ x: 0, y: 0 });
  });
});

describe("a canvas that is not the shape of its box", () => {
  // Wider on screen than the viewBox: the browser fits the box in and
  // leaves a band either side, so the drawing starts 100px in.
  const WIDE = { left: 0, top: 0, width: 1200, height: 600 };

  it("takes the smaller of the two scales", () => {
    expect(viewScale(WIDE, BOX)).toBe(1);
    expect(viewScale({ width: 500, height: 600 }, BOX)).toBe(0.5);
  });

  it("counts the band the browser left at the side", () => {
    // The middle of the element is still the middle of the box.
    expect(
      graphPointIn(WIDE, BOX, START_CAMERA, { clientX: 600, clientY: 300 }),
    ).toEqual({ x: 500, y: 300 });
    // And the left edge of the drawing is 100px in, not at the element's.
    expect(
      graphPointIn(WIDE, BOX, START_CAMERA, { clientX: 100, clientY: 300 }),
    ).toEqual({ x: 0, y: 300 });
  });

  it("drags by what the drawing is scaled to, not by the element", () => {
    expect(pannedBy(START_CAMERA, BOX, WIDE, 60, 0).x).toBe(-60);
  });
});

describe("the ground under the view", () => {
  it("covers more than the view, so its edge is never reached", () => {
    const rect = visibleRect(START_CAMERA, BOX);
    expect(rect.width).toBeGreaterThan(BOX.width);
    expect(rect.x).toBeLessThan(0);
    expect(rect.x + rect.width).toBeGreaterThan(BOX.width);
  });

  it("is square, so a canvas shorter than its box still stands on it", () => {
    const rect = visibleRect(START_CAMERA, BOX);
    expect(rect.width).toBe(rect.height);
    // An element half the box's height shows twice the box's width across.
    expect(rect.width).toBeGreaterThanOrEqual(BOX.width * 2);
  });

  it("follows the camera, which is what makes it the surface", () => {
    const moved = visibleRect({ x: 400, y: 0, zoom: 1 }, BOX);
    expect(moved.x).toBe(visibleRect(START_CAMERA, BOX).x + 400);
  });

  it("grows as the view zooms out, in graph coordinates", () => {
    const close = visibleRect({ x: 0, y: 0, zoom: 2 }, BOX);
    const far = visibleRect({ x: 0, y: 0, zoom: 0.5 }, BOX);
    expect(far.width).toBe(close.width * 4);
  });
});

describe("framing a set of points", () => {
  it("puts their middle in the middle of the view", () => {
    const camera = frameAround(
      [
        { x: 200, y: 100 },
        { x: 600, y: 500 },
      ],
      BOX,
    );
    // Screen centre is the graph point box/2 + camera.
    expect(camera.x + BOX.width / 2).toBe(400);
    expect(camera.y + BOX.height / 2).toBe(300);
  });

  it("holds all of them, with room for their labels", () => {
    const points = [
      { x: -300, y: -200 },
      { x: 1300, y: 800 },
    ];
    const camera = frameAround(points, BOX, { padding: 90 });
    for (const p of points) {
      const sx = (p.x - camera.x - BOX.width / 2) * camera.zoom + BOX.width / 2;
      const sy =
        (p.y - camera.y - BOX.height / 2) * camera.zoom + BOX.height / 2;
      expect(sx).toBeGreaterThanOrEqual(90 - 0.5);
      expect(sx).toBeLessThanOrEqual(BOX.width - 90 + 0.5);
      expect(sy).toBeGreaterThanOrEqual(90 - 0.5);
      expect(sy).toBeLessThanOrEqual(BOX.height - 90 + 0.5);
    }
  });

  it("does not blow two pages up to fill a screen", () => {
    const camera = frameAround(
      [
        { x: 480, y: 300 },
        { x: 520, y: 300 },
      ],
      BOX,
      { maxZoom: 1.6 },
    );
    expect(camera.zoom).toBe(1.6);
  });

  it("stays where it was when there is nothing to frame", () => {
    expect(frameAround([], BOX)).toEqual(START_CAMERA);
  });

  it("never asks for more zoom than the canvas allows", () => {
    const camera = frameAround(
      [
        { x: 0, y: 0 },
        { x: 100_000, y: 100_000 },
      ],
      BOX,
    );
    expect(camera.zoom).toBe(MIN_ZOOM);
  });
});

describe("dragging the background", () => {
  it("moves the canvas with the pointer, not against it", () => {
    // Drag right: what was on the left comes into view, so the camera
    // moves left.
    const after = pannedBy(START_CAMERA, BOX, RECT, 50, 0);
    expect(after.x).toBe(-100); // 50px on a half-size canvas is 100
    expect(after.y).toBe(0);
  });

  it("moves less when zoomed in, since a pixel is worth less", () => {
    const zoomed = { ...START_CAMERA, zoom: 4 };
    expect(pannedBy(zoomed, BOX, RECT, 50, 0).x).toBe(-25);
  });
});

describe("zooming about a point", () => {
  it("leaves that point where it was", () => {
    const at = { x: 700, y: 420 };
    const after = zoomedAbout(START_CAMERA, BOX, at, 2);
    // The same graph point must still land on the same spot on screen.
    const before = screenOf(START_CAMERA, at);
    expect(screenOf(after, at)).toBeCloseTo(before, 6);
  });

  it("stops at the ends rather than running away", () => {
    let camera = START_CAMERA;
    for (let i = 0; i < 50; i++)
      camera = zoomedAbout(camera, BOX, { x: 0, y: 0 }, 2);
    expect(camera.zoom).toBe(MAX_ZOOM);
    for (let i = 0; i < 80; i++)
      camera = zoomedAbout(camera, BOX, { x: 0, y: 0 }, 0.5);
    expect(camera.zoom).toBe(MIN_ZOOM);
  });

  it("gives back the very same camera when it cannot zoom further", () => {
    const at = { x: 10, y: 10 };
    const far = zoomedAbout({ x: 0, y: 0, zoom: MAX_ZOOM }, BOX, at, 2);
    expect(far).toEqual({ x: 0, y: 0, zoom: MAX_ZOOM });
  });

  /** Where a graph point lands across the canvas, 0 at the left edge. */
  function screenOf(
    camera: { x: number; y: number; zoom: number },
    at: { x: number },
  ) {
    return (at.x - camera.x - BOX.width / 2) * camera.zoom + BOX.width / 2;
  }
});

describe("the transform the drawing hangs from", () => {
  it("is nothing at all at rest", () => {
    expect(cameraTransform(START_CAMERA, BOX)).toBe(
      "translate(500 300) scale(1) translate(-500 -300)",
    );
  });

  it("carries the zoom and the camera", () => {
    expect(cameraTransform({ x: 40, y: -10, zoom: 2 }, BOX)).toBe(
      "translate(500 300) scale(2) translate(-540 -290)",
    );
  });
});
