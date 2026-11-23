import { describe, expect, it } from "vitest";
import { bendOffsets, edgeShape, pairKey } from "./graph-edges";

const end = (x: number, y: number, r = 20) => ({ at: { x, y }, r });
/** Every number in a path, in order. */
const nums = (d: string) => d.match(/-?\d+(\.\d+)?/g)!.map(Number);

describe("a connection between two pages", () => {
  it("starts and ends clear of both rims", () => {
    const a = end(0, 0, 30);
    const b = end(400, 0, 20);
    const [x1, y1, , , x2, y2] = nums(edgeShape(a, b).d);
    expect(x1).toBeGreaterThanOrEqual(30);
    expect(y1).toBe(0);
    expect(x2).toBeLessThanOrEqual(400 - 20);
    expect(y2).toBe(0);
  });

  it("leaves the same gap whichever way it is written", () => {
    const a = end(0, 0, 30);
    const b = end(400, 0, 30);
    const there = nums(edgeShape(a, b).d);
    const back = nums(edgeShape(b, a).d);
    expect(there[0]).toBeCloseTo(400 - back[0], 6);
  });

  it("is straight when it is not bent", () => {
    const shape = edgeShape(end(0, 0), end(300, 300), 0);
    const [x1, y1, cx, cy, x2, y2] = nums(shape.d);
    // The control point sits on the line, so the curve is the line.
    expect(cx).toBeCloseTo((x1 + x2) / 2, 6);
    expect(cy).toBeCloseTo((y1 + y2) / 2, 6);
  });

  it("bends to opposite sides for opposite bends", () => {
    const one = nums(edgeShape(end(0, 0), end(300, 0), 0.2).d);
    const other = nums(edgeShape(end(0, 0), end(300, 0), -0.2).d);
    // Same control x, mirrored control y.
    expect(one[2]).toBeCloseTo(other[2], 6);
    expect(one[3]).toBeCloseTo(-other[3], 6);
  });

  it("puts its middle on the curve, not on the control point", () => {
    const shape = edgeShape(end(0, 0), end(300, 0), 0.2);
    const [, , , cy] = nums(shape.d);
    // Halfway along a quadratic is half as far out as the control point.
    expect(shape.mid.y).toBeCloseTo(cy / 2, 1);
    expect(shape.mid.x).toBeCloseTo(150, 0);
  });

  it("keeps the gradient on the line between the two pages", () => {
    // Not on the arc: a gradient measured along a bent path would slide its
    // colours about as the bend changes.
    const shape = edgeShape(end(10, 20, 25), end(310, 220, 25), 0.3);
    expect([shape.x1, shape.y1, shape.x2, shape.y2]).toEqual([10, 20, 310, 220]);
  });

  it("does not run backwards when two big pages nearly touch", () => {
    const a = end(0, 0, 40);
    const b = end(50, 0, 40);
    const [x1, , , , x2] = nums(edgeShape(a, b).d);
    expect(x1).toBeLessThanOrEqual(x2 + 0.001);
  });

  it("draws something, not nothing, for two pages in the same place", () => {
    const shape = edgeShape(end(100, 100), end(100, 100));
    expect(shape.d).toContain("M100 100");
    expect(shape.d).not.toContain("NaN");
  });
});

describe("several links between the same two pages", () => {
  it("lies straight when there is only one", () => {
    expect(bendOffsets(1)).toEqual([0]);
  });

  it("fans either side of straight, evenly", () => {
    const two = bendOffsets(2);
    expect(two).toHaveLength(2);
    expect(two[0]).toBeCloseTo(-two[1], 6);

    const three = bendOffsets(3);
    expect(three[1]).toBeCloseTo(0, 6);
    expect(three[0]).toBeCloseTo(-three[2], 6);
  });

  it("counts a pair the same way round or not", () => {
    expect(pairKey("a", "b")).toBe(pairKey("b", "a"));
    expect(pairKey("a", "b")).not.toBe(pairKey("a", "c"));
  });
});
