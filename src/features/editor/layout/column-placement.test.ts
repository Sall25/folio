import { describe, expect, it } from "vitest";
import {
  COLUMN_EDGE,
  pinScrollLeft,
  placeColumn,
  type HorizontalScroller,
} from "./column-placement";

// The page's title, cover and text once slid off the left edge in a smaller
// desktop window, and so did a loading database's skeleton (it sits in the
// same column). These pin the column inside the visible area.

const base = {
  mainLeft: 400, // beside the sidebar
  wrapperLeft: 400,
  columnWidth: 800,
  preferred: 260,
};

describe("placeColumn", () => {
  it("keeps the page's own spacing when the column fits", () => {
    const p = placeColumn({ ...base, mainWidth: 1500 });
    expect(p.offset).toBe(260);
  });

  it("moves left just enough on a narrower window", () => {
    const p = placeColumn({ ...base, mainWidth: 1000 });
    // The column ends COLUMN_EDGE from the right edge.
    expect(p.offset).toBeLessThan(260);
    expect(p.offset + 800).toBe(1000 - COLUMN_EDGE);
  });

  it("never starts left of the visible area, and narrows instead", () => {
    for (const mainWidth of [900, 700, 500, 300, 100, 0]) {
      const p = placeColumn({ ...base, mainWidth });
      expect(p.offset).toBeGreaterThanOrEqual(COLUMN_EDGE);
      expect(p.room).toBe(Math.max(0, mainWidth - COLUMN_EDGE * 2));
    }
  });

  it("counts from the visible area when the wrapper starts further left", () => {
    // The wrapper runs wider than the visible area (it starts under the
    // sidebar): offsets are from the wrapper, edges from the visible area.
    const p = placeColumn({
      ...base,
      wrapperLeft: 0,
      mainWidth: 600,
    });
    expect(p.offset).toBeGreaterThanOrEqual(400 + COLUMN_EDGE);
  });

  it("doesn't move the page when a side view opens", () => {
    const before = placeColumn({ ...base, mainWidth: 1200 });
    const withPeek = placeColumn({ ...base, mainWidth: 720, peekRoom: 480 });
    expect(withPeek).toEqual(before);
  });

  it("keeps the column out from under the docked sidebar", () => {
    // What a smaller desktop window measured: the page area starts at the
    // window's left, under a 289px sidebar; the column was fitted to the
    // whole 1012px and put 148px in, under the sidebar.
    const p = placeColumn({
      mainLeft: 0,
      wrapperLeft: 0,
      mainWidth: 1012,
      coveredUntil: 289,
      columnWidth: 800,
      preferred: 260,
    });
    expect(p.offset).toBeGreaterThanOrEqual(289 + COLUMN_EDGE);
    expect(p.room).toBe(1012 - 289 - COLUMN_EDGE * 2);
    expect(p.offset + Math.min(800, p.room)).toBeLessThanOrEqual(
      1012 - COLUMN_EDGE,
    );
  });

  it("stays clear of the sidebar at every window width", () => {
    for (let mainWidth = 400; mainWidth <= 2000; mainWidth += 50) {
      const p = placeColumn({
        mainLeft: 0,
        wrapperLeft: 0,
        mainWidth,
        coveredUntil: 289,
        columnWidth: 800,
        preferred: 450,
      });
      expect(p.offset).toBeGreaterThanOrEqual(289 + COLUMN_EDGE);
    }
  });

  it("changes nothing when the sidebar is beside the page area", () => {
    const beside = placeColumn({ ...base, mainWidth: 1000, coveredUntil: 400 });
    expect(beside).toEqual(placeColumn({ ...base, mainWidth: 1000 }));
  });

  it("ignores a negative margin as a side view's room", () => {
    const p = placeColumn({ ...base, mainWidth: 1000, peekRoom: -65 });
    expect(p).toEqual(placeColumn({ ...base, mainWidth: 1000 }));
  });
});

function makeScroller(start = 0) {
  let listener: (() => void) | null = null;
  const el: HorizontalScroller & { fire: () => void; attached: () => boolean } =
    {
      scrollLeft: start,
      addEventListener: (_t, l) => {
        listener = l;
      },
      removeEventListener: (_t, l) => {
        if (listener === l) listener = null;
      },
      fire: () => listener?.(),
      attached: () => listener != null,
    };
  return el;
}

describe("pinScrollLeft", () => {
  it("puts it back at the left edge right away", () => {
    const el = makeScroller(450);
    pinScrollLeft(el);
    expect(el.scrollLeft).toBe(0);
  });

  it("undoes a sideways scroll from bringing something into view", () => {
    const el = makeScroller();
    pinScrollLeft(el);
    el.scrollLeft = 320; // the browser showing a focused cell
    el.fire();
    expect(el.scrollLeft).toBe(0);
  });

  it("stops once cleaned up", () => {
    const el = makeScroller();
    const stop = pinScrollLeft(el);
    stop();
    expect(el.attached()).toBe(false);
    el.scrollLeft = 100;
    el.fire();
    expect(el.scrollLeft).toBe(100);
  });
});
