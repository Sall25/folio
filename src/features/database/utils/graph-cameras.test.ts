import { beforeEach, describe, expect, it } from "vitest";
import {
  forgetCamera,
  onFitRequest,
  rememberCamera,
  rememberedCamera,
  requestFit,
} from "./graph-cameras";

describe("where each graph was left looking", () => {
  beforeEach(() => forgetCamera());

  it("has nothing to say about a view nobody has opened", () => {
    expect(rememberedCamera("g1")).toBeUndefined();
  });

  it("gives a view back the camera it had", () => {
    rememberCamera("g1", { x: 120, y: -40, zoom: 1.5 });
    expect(rememberedCamera("g1")).toEqual({ x: 120, y: -40, zoom: 1.5 });
  });

  it("keeps each view's own", () => {
    rememberCamera("g1", { x: 10, y: 0, zoom: 1 });
    rememberCamera("g2", { x: 0, y: 90, zoom: 2 });
    expect(rememberedCamera("g1")).toEqual({ x: 10, y: 0, zoom: 1 });
    expect(rememberedCamera("g2")).toEqual({ x: 0, y: 90, zoom: 2 });
  });

  it("holds nothing for a view with no id, and does not fall over", () => {
    rememberCamera(undefined, { x: 1, y: 1, zoom: 1 });
    expect(rememberedCamera(undefined)).toBeUndefined();
  });

  it("forgets one without forgetting the rest", () => {
    rememberCamera("g1", { x: 10, y: 0, zoom: 1 });
    rememberCamera("g2", { x: 0, y: 90, zoom: 2 });
    forgetCamera("g1");
    expect(rememberedCamera("g1")).toBeUndefined();
    expect(rememberedCamera("g2")).toBeDefined();
  });
});

describe("asking a canvas for everything in view", () => {
  beforeEach(() => forgetCamera());

  it("reaches the canvas showing that view", () => {
    let asked = 0;
    const off = onFitRequest("g1", () => (asked += 1));
    requestFit("g1");
    expect(asked).toBe(1);
    off();
  });

  it("leaves other views alone", () => {
    let asked = 0;
    const off = onFitRequest("g1", () => (asked += 1));
    requestFit("g2");
    expect(asked).toBe(0);
    off();
  });

  it("stops asking a canvas that has gone", () => {
    let asked = 0;
    onFitRequest("g1", () => (asked += 1))();
    requestFit("g1");
    expect(asked).toBe(0);
  });

  it("asks both canvases when one view is open twice", () => {
    let asked = 0;
    const a = onFitRequest("g1", () => (asked += 1));
    const b = onFitRequest("g1", () => (asked += 1));
    requestFit("g1");
    expect(asked).toBe(2);
    a();
    b();
  });

  it("is quiet about a view with no id, and about nobody listening", () => {
    expect(() => onFitRequest(undefined, () => {})()).not.toThrow();
    expect(() => requestFit(undefined)).not.toThrow();
    expect(() => requestFit("nobody")).not.toThrow();
  });
});
