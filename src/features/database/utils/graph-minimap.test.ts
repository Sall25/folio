import { describe, expect, it } from "vitest";
import {
  busiest,
  fromMinimap,
  minimapFit,
  minimapViewport,
  onMinimap,
} from "./graph-minimap";
import { START_CAMERA } from "./graph-camera";

const BOX = { width: 1000, height: 600 };
const MAP = { width: 170, height: 112 };

const spread = [
  { x: 0, y: 0 },
  { x: 1000, y: 600 },
  { x: 500, y: 300 },
];

describe("the map in the corner", () => {
  it("fits everything inside it", () => {
    const fit = minimapFit(spread, BOX, MAP);
    for (const point of spread) {
      const at = onMinimap(fit, point);
      expect(at.x).toBeGreaterThanOrEqual(0);
      expect(at.y).toBeGreaterThanOrEqual(0);
      expect(at.x).toBeLessThanOrEqual(MAP.width);
      expect(at.y).toBeLessThanOrEqual(MAP.height);
    }
  });

  it("keeps a page far from the rest on the map rather than off it", () => {
    const fit = minimapFit([...spread, { x: 9000, y: -4000 }], BOX, MAP);
    const far = onMinimap(fit, { x: 9000, y: -4000 });
    expect(far.x).toBeLessThanOrEqual(MAP.width);
    expect(far.y).toBeGreaterThanOrEqual(0);
  });

  it("reads a press back into the graph's own coordinates", () => {
    const fit = minimapFit(spread, BOX, MAP);
    const point = { x: 320, y: 180 };
    const back = fromMinimap(fit, onMinimap(fit, point));
    expect(back.x).toBeCloseTo(point.x, 6);
    expect(back.y).toBeCloseTo(point.y, 6);
  });

  it("says nothing sillier than the middle when it has no size", () => {
    expect(fromMinimap({ scale: 0, dx: 0, dy: 0 }, { x: 4, y: 4 })).toEqual({
      x: 0,
      y: 0,
    });
  });
});

describe("the frame on the map", () => {
  it("shrinks as the canvas zooms in", () => {
    const fit = minimapFit(spread, BOX, MAP, START_CAMERA);
    const wide = minimapViewport(fit, START_CAMERA, BOX);
    const close = minimapViewport(fit, { x: 0, y: 0, zoom: 3 }, BOX);
    expect(close.width).toBeCloseTo(wide.width / 3, 6);
  });

  it("stays on the map when the canvas is looking at nothing", () => {
    // Panned far away from every page: the map takes the view in too, so
    // the frame has somewhere to be.
    const camera = { x: 4000, y: 2500, zoom: 1 };
    const fit = minimapFit(spread, BOX, MAP, camera);
    const frame = minimapViewport(fit, camera, BOX);
    expect(frame.x).toBeGreaterThanOrEqual(-0.001);
    expect(frame.y).toBeGreaterThanOrEqual(-0.001);
    expect(frame.x + frame.width).toBeLessThanOrEqual(MAP.width + 0.001);
    expect(frame.y + frame.height).toBeLessThanOrEqual(MAP.height + 0.001);
  });

  it("holds what the canvas holds: a page in view is a page in the frame", () => {
    const camera = { x: 0, y: 0, zoom: 1 };
    const fit = minimapFit(spread, BOX, MAP, camera);
    const frame = minimapViewport(fit, camera, BOX);
    const middle = onMinimap(fit, { x: 500, y: 300 });
    expect(middle.x).toBeGreaterThanOrEqual(frame.x);
    expect(middle.x).toBeLessThanOrEqual(frame.x + frame.width);
    expect(middle.y).toBeGreaterThanOrEqual(frame.y);
    expect(middle.y).toBeLessThanOrEqual(frame.y + frame.height);
  });
});

describe("the pages worth jumping to", () => {
  const nodes = [
    { id: "a", degree: 2 },
    { id: "b", degree: 7 },
    { id: "c", degree: 0 },
    { id: "d", degree: 4 },
  ];

  it("is the busiest first", () => {
    expect(busiest(nodes).map((n) => n.id)).toEqual(["b", "d", "a"]);
  });

  it("leaves out the ones nothing is joined to", () => {
    expect(busiest(nodes).map((n) => n.id)).not.toContain("c");
  });

  it("stops where it is told", () => {
    expect(busiest(nodes, 2).map((n) => n.id)).toEqual(["b", "d"]);
  });

  it("does not reorder what it was given", () => {
    const before = nodes.map((n) => n.id);
    busiest(nodes);
    expect(nodes.map((n) => n.id)).toEqual(before);
  });
});
