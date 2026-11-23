import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearGraphSession,
  forgetGraphSessions,
  graphSession,
  setGraphSession,
  subscribeGraphSession,
} from "./graph-session";

afterEach(forgetGraphSessions);

describe("what a graph view is doing right now", () => {
  it("starts with nothing typed and nothing picked", () => {
    expect(graphSession("v1")).toEqual({
      query: "",
      pathMode: false,
      picked: [],
      chain: [],
    });
  });

  it("gives the very same object every time until something changes", () => {
    // So a component reading it is not re-rendered for nothing.
    expect(graphSession("v1")).toBe(graphSession("v2"));
    setGraphSession("v1", { query: "exam" });
    expect(graphSession("v1")).toBe(graphSession("v1"));
  });

  it("keeps each view's own", () => {
    setGraphSession("v1", { query: "exam" });
    expect(graphSession("v1").query).toBe("exam");
    expect(graphSession("v2").query).toBe("");
  });

  it("changes one part without forgetting the rest", () => {
    setGraphSession("v1", { pathMode: true, picked: ["a"] });
    setGraphSession("v1", { query: "rubric" });
    expect(graphSession("v1")).toMatchObject({
      pathMode: true,
      picked: ["a"],
      query: "rubric",
    });
  });

  it("tells whoever is watching that view, and nobody else", () => {
    const mine = vi.fn();
    const theirs = vi.fn();
    subscribeGraphSession("v1", mine);
    subscribeGraphSession("v2", theirs);
    setGraphSession("v1", { query: "a" });
    expect(mine).toHaveBeenCalledTimes(1);
    expect(theirs).not.toHaveBeenCalled();
  });

  it("stops telling someone who has stopped watching", () => {
    const watcher = vi.fn();
    const off = subscribeGraphSession("v1", watcher);
    off();
    setGraphSession("v1", { query: "a" });
    expect(watcher).not.toHaveBeenCalled();
  });

  it("clears back to resting, and says so", () => {
    const watcher = vi.fn();
    subscribeGraphSession("v1", watcher);
    setGraphSession("v1", { query: "a", picked: ["x"] });
    clearGraphSession("v1");
    expect(graphSession("v1").query).toBe("");
    expect(graphSession("v1").picked).toEqual([]);
    expect(watcher).toHaveBeenCalledTimes(2);
  });

  it("does nothing at all without a view", () => {
    const watcher = vi.fn();
    const off = subscribeGraphSession(undefined, watcher);
    setGraphSession(undefined, { query: "a" });
    clearGraphSession(undefined);
    off();
    expect(graphSession(undefined).query).toBe("");
    expect(watcher).not.toHaveBeenCalled();
  });
});
