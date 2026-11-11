import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  linksToBlock,
  restoreScroll,
  saveScrollPosition,
  savedScrollPosition,
  type RestoreEnd,
  type ScrollBox,
} from "./scroll-restore";

// Coming back to a page should land where it was left. This broke once
// already, when pages started taking longer to fill in: the scroll ran
// once, too early, and stopped short. These pin the behavior down.

/** A scroll container like the browser's: scrollTop can't pass the bottom. */
function makeBox(height: number, client = 500) {
  let top = 0;
  const box = {
    height,
    client,
    writes: 0,
    get scrollHeight() {
      return box.height;
    },
    get clientHeight() {
      return box.client;
    },
    get scrollTop() {
      return top;
    },
    set scrollTop(v: number) {
      box.writes += 1;
      top = Math.max(0, Math.min(v, box.height - box.client));
    },
  };
  return box satisfies ScrollBox;
}

/** Frames by hand, 16ms apart. */
function makeClock() {
  let time = 0;
  let queued: (() => void) | null = null;
  return {
    now: () => time,
    schedule: (run: () => void) => {
      queued = run;
      return () => {
        if (queued === run) queued = null;
      };
    },
    frame(n = 1) {
      for (let i = 0; i < n; i++) {
        time += 16;
        const run = queued;
        queued = null;
        run?.();
      }
    },
    get pending() {
      return queued != null;
    },
  };
}

function start(
  box: ScrollBox,
  target: () => number | null,
  extra: { settleMs?: number; timeoutMs?: number } = {},
) {
  const clock = makeClock();
  const ends: RestoreEnd[] = [];
  const handle = restoreScroll(box, {
    target,
    onEnd: (r) => ends.push(r),
    schedule: clock.schedule,
    now: clock.now,
    settleMs: extra.settleMs ?? 200,
    timeoutMs: extra.timeoutMs ?? 3000,
  });
  return { clock, ends, handle };
}

describe("restoreScroll", () => {
  it("waits for the page's content before scrolling", () => {
    const box = makeBox(5000);
    let ready = false;
    const { clock, ends } = start(box, () => (ready ? 1200 : null));
    clock.frame(30);
    expect(box.scrollTop).toBe(0);
    expect(ends).toEqual([]);
    ready = true;
    clock.frame();
    expect(box.scrollTop).toBe(1200);
  });

  it("keeps going while the page grows until the spot exists", () => {
    // The regression: the page is short when it opens (databases, images
    // still loading), so a single scroll stops at the bottom.
    const box = makeBox(900);
    const { clock, ends } = start(box, () => 2000);
    clock.frame();
    expect(box.scrollTop).toBe(400);
    clock.frame(30);
    expect(ends).toEqual([]); // not there yet: doesn't give up early
    box.height = 4000;
    clock.frame();
    expect(box.scrollTop).toBe(2000);
    clock.frame(20);
    expect(ends).toEqual(["settled"]);
  });

  it("puts it back when something else scrolls meanwhile", () => {
    const box = makeBox(5000);
    const { clock, ends } = start(box, () => 1500);
    clock.frame();
    expect(box.scrollTop).toBe(1500);
    box.scrollTop = 0; // the editor showing its selection, say
    clock.frame();
    expect(box.scrollTop).toBe(1500);
    expect(ends).toEqual([]);
  });

  it("settles only once the page stops growing", () => {
    const box = makeBox(5000);
    const { clock, ends } = start(box, () => 1000);
    clock.frame(5);
    box.height = 5600; // a database below finished loading
    clock.frame(5);
    expect(ends).toEqual([]);
    clock.frame(20);
    expect(ends).toEqual(["settled"]);
    expect(clock.pending).toBe(false);
  });

  it("follows a target that moves (a heading pushed down)", () => {
    const box = makeBox(5000);
    let goal = 800;
    const { clock } = start(box, () => goal);
    clock.frame();
    goal = 950;
    clock.frame();
    expect(box.scrollTop).toBe(950);
  });

  it("stops for good when the person takes over", () => {
    const box = makeBox(5000);
    const { clock, ends, handle } = start(box, () => 1500);
    clock.frame();
    handle.cancel();
    box.scrollTop = 300;
    const writes = box.writes;
    clock.frame(10);
    expect(box.scrollTop).toBe(300);
    expect(box.writes).toBe(writes);
    expect(ends).toEqual(["cancelled"]);
    expect(handle.done).toBe(true);
  });

  it("gives up after the timeout", () => {
    const box = makeBox(5000);
    const { clock, ends } = start(box, () => null, { timeoutMs: 500 });
    clock.frame(40);
    expect(ends).toEqual(["timeout"]);
    expect(clock.pending).toBe(false);
  });

  it("goes to the top for a page never left before", () => {
    const box = makeBox(5000);
    box.scrollTop = 2400; // still at the previous page's spot
    const { clock, ends } = start(box, () => 0);
    clock.frame();
    expect(box.scrollTop).toBe(0);
    clock.frame(20);
    expect(ends).toEqual(["settled"]);
  });

  it("ends once, whatever happens after", () => {
    const box = makeBox(5000);
    const { clock, ends, handle } = start(box, () => 100);
    clock.frame(20);
    handle.cancel();
    expect(ends).toEqual(["settled"]);
  });
});

describe("saved positions", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
  });
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("saves and reads back per page", () => {
    saveScrollPosition("a", 1234.6);
    saveScrollPosition("b", 10);
    expect(savedScrollPosition("a")).toBe(1235);
    expect(savedScrollPosition("b")).toBe(10);
    expect(savedScrollPosition("c")).toBeUndefined();
  });

  it("keeps only the most recent pages", () => {
    for (let i = 0; i < 205; i++) saveScrollPosition(`p${i}`, i);
    expect(savedScrollPosition("p0")).toBeUndefined();
    expect(savedScrollPosition("p204")).toBe(204);
    saveScrollPosition("p5", 99); // touched again: kept
    saveScrollPosition("new", 1);
    expect(savedScrollPosition("p5")).toBe(99);
  });

  it("survives broken or missing storage", () => {
    store.set("editor-scroll-position", "{not json");
    expect(savedScrollPosition("a")).toBeUndefined();
    delete (globalThis as { localStorage?: unknown }).localStorage;
    expect(() => saveScrollPosition("a", 1)).not.toThrow();
    expect(savedScrollPosition("a")).toBeUndefined();
  });
});

describe("linksToBlock", () => {
  it("is a block link, not a database view pick", () => {
    expect(linksToBlock("#heading-1")).toBe(true);
    expect(linksToBlock("#view=abc")).toBe(false);
    expect(linksToBlock("")).toBe(false);
    expect(linksToBlock("#")).toBe(false);
  });
});
