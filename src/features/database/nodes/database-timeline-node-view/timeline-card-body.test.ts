import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { el, loadStylesheets, resolve } from "src/test/css-cascade";

// A card's name is allowed out of the card.
//
// A bar is as wide as the days it covers, which is usually narrower than the
// page's name, so the name runs on past it over the grid — the same way the
// row-packing estimate in use-timeline-layout assumes it does.
//
// Two stylesheets used to set this class: timeline-card-body.scss, which lets
// it spill, and database-timeline-node-view.scss, which cut it off with an
// ellipsis. Same class, same weight, so the winner was whichever loaded last
// — and the one that won cut the name off. This compiles both, in either
// order, and asks who wins.

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "../../../..");

const NODE_VIEW =
  "features/database/nodes/database-timeline-node-view/database-timeline-node-view.scss";
const CARD_BODY =
  "features/database/nodes/database-timeline-node-view/timeline-card-body.scss";

// Both orders. Which sheet a bundler puts first is not something this file
// should have to know — and when it decided the answer, that was the bug.
const orders = {
  "node view first": loadStylesheets(src, [NODE_VIEW, CARD_BODY]),
  "card body first": loadStylesheets(src, [CARD_BODY, NODE_VIEW]),
};

const bar = el("db-tl-bar tag:div");
const content = el("db-tl-bar__content tag:div");
const title = el("db-tl-bar__title tiptap-button-text tag:span");

// Where the card sits is the box's business, not the card's. timeline-bar.tsx
// places .db-tl-bar-box on the record's line and the card fills it with an
// inline inset: 0. A stylesheet that also offsets the card moves it off that
// line — and an inline inset can override a top but never a transform, which
// is how every card came to sit half a row high, up under the day numbers.
describe.each(Object.entries(orders))("where a card sits (%s)", (_n, rules) => {
  const chain = [el("db-tl-bar-box tag:div"), bar];

  it("takes its line from the box it is placed in", () => {
    expect(resolve(rules, chain, "top")).toBeNull();
    expect(resolve(rules, chain, "bottom")).toBeNull();
  });

  it("is not moved off it by a transform", () => {
    const moved = resolve(rules, chain, "transform");
    expect(moved?.value ?? "none").toBe("none");
  });
});

describe.each(Object.entries(orders))("a card's name (%s)", (_name, rules) => {
  const chain = [bar, content, title];

  it("is not cut off at the card's edge", () => {
    expect(resolve(rules, chain, "overflow")?.value).toBe("visible");
  });

  it("has no ellipsis waiting to be applied", () => {
    expect(resolve(rules, chain, "text-overflow")?.value).not.toBe("ellipsis");
  });

  it("stays on one line", () => {
    expect(resolve(rules, chain, "white-space")?.value).toBe("nowrap");
  });

  it("does not shrink to fit the card", () => {
    // flex-shrink: 1 would let the name be squeezed instead of spilling.
    expect(resolve(rules, chain, "flex-shrink")?.value).toBe("0");
  });
});

// The marker on the current column is a circle sized for a date. A time is
// wider than a date, so in the Day timeframe it has to give.
describe.each(Object.entries(orders))("the current column (%s)", (_n, rules) => {
  const days = el("db-tl-header__days tag:div");
  const hourly = el("db-tl-header__days tag:div", { "data-unit": "hour" });
  const marker = el("db-tl-header__day-num db-tl-header__day-num--today tag:span");

  it("is a circle when the columns are dates", () => {
    expect(resolve(rules, [days, marker], "width")?.value).toBe("22px");
    expect(resolve(rules, [days, marker], "border-radius")?.value).toBe("50%");
  });

  it("gives way to a time when they are hours", () => {
    expect(resolve(rules, [hourly, marker], "width")?.value).toBe("auto");
    expect(resolve(rules, [hourly, marker], "border-radius")?.value).toBe(
      "11px",
    );
  });
});
