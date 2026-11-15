import { describe, expect, it } from "vitest";
import { paddingForEdge } from "./use-database-align";

// A database is lined up by padding its scroller, and that padding is
// written inline — which makes this the only thing that can set it. A
// stylesheet rule for the left padding of a .db-node is overruled here on
// the next pass, so where a database starts is decided by this number.
//
// The numbers below are a real timeline's: the node starts at the window's
// left edge, 353px of padding holds its content in the page's text column,
// and the sidebar is 289px wide.

const COLUMN = 353;
const SIDEBAR = 289;

describe("lining a database up with the text column", () => {
  it("keeps the padding that already does it", () => {
    // Content at the column with that padding on: the same number comes
    // back, so nothing is written and nothing moves.
    expect(paddingForEdge(COLUMN, COLUMN, COLUMN, 0)).toBe(COLUMN);
  });

  it("pads an unpadded database over to the column", () => {
    expect(paddingForEdge(COLUMN, 0, 0, 0)).toBe(COLUMN);
  });
});

describe("lining a timeline up with the sidebar instead", () => {
  it("gives back the room between the sidebar and the column", () => {
    // From the aligned state: the content moves to the sidebar's edge and
    // the 64px between the two goes to the grid.
    expect(paddingForEdge(SIDEBAR, COLUMN, COLUMN, 0)).toBe(SIDEBAR);
    expect(COLUMN - SIDEBAR).toBe(64);
  });

  it("stays there once it is there", () => {
    // Idempotent, or every pass would walk the view further over — the
    // hook runs on resize, on transitions and on a settle timer.
    const once = paddingForEdge(SIDEBAR, COLUMN, COLUMN, 0);
    expect(paddingForEdge(SIDEBAR, SIDEBAR, once, 0)).toBe(once);
  });

  it("is not thrown off by a scrolled grid", () => {
    // Measured while scrolled, the content reads further left than it
    // sits; the scroll distance goes back in, or the padding grows by it
    // every time the grid is scrolled.
    expect(paddingForEdge(SIDEBAR, SIDEBAR - 500, SIDEBAR, 500)).toBe(SIDEBAR);
  });

  it("never pads a database off the left of the window", () => {
    expect(paddingForEdge(0, 800, 0, 0)).toBe(0);
  });
});
