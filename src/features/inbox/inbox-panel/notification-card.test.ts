import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { el, loadStylesheets, resolve } from "src/test/css-cascade";

// The card spilled its content out of both edges, and no unit test would
// have caught it: the Card primitive centres its children, so the body took
// the width of its own content rather than the card's, and a long page title
// in __source is one unbreakable line whose percentage max-width doesn't
// count while the browser works out that intrinsic width. The body came out
// 461px wide inside a 340px card, centred, so it hung over both sides.
//
// These are the declarations that keep the content inside, read the way the
// browser reads them: compile both stylesheets in the order the component
// loads them (the Card primitive first, this card's own sheet after), then
// ask which declaration wins.

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "../../..");

const SHEETS = [
  "components/tiptap-ui-primitive/card/card.scss",
  "features/inbox/inbox-panel/notification-card.scss",
];

const rules = loadStylesheets(src, SHEETS);

// The card element carries both classes: the primitive's and this card's.
const card = el("tiptap-card notification-card tag:div");
const body = el("tiptap-card-body tag:div");
const head = el("notification-card__head tag:div");
const kind = el("notification-card__kind tag:span");
const source = el("notification-card__source tag:div");
const sourceText = el("tag:span");

describe("the notification card holds its content", () => {
  it("fills the card with its body instead of centring it", () => {
    // The primitive's align-items: center is what let the body size itself
    // to its content. This must win over it.
    expect(resolve(rules, [card], "align-items")?.value).toBe("stretch");
  });

  it("lets the body shrink to the card", () => {
    expect(resolve(rules, [card, body], "min-width")?.value).toBe("0");
  });

  it("keeps the card to one width", () => {
    expect(resolve(rules, [card], "width")?.value).toBe("340px");
  });

  it("ellipsizes the source title instead of widening the card", () => {
    const chain = [card, body, source, sourceText];
    expect(resolve(rules, chain, "white-space")?.value).toBe("nowrap");
    expect(resolve(rules, chain, "overflow")?.value).toBe("hidden");
    expect(resolve(rules, chain, "text-overflow")?.value).toBe("ellipsis");
    // Without this the ellipsis never applies: a flex item won't shrink
    // below its own text.
    expect(resolve(rules, chain, "min-width")?.value).toBe("0");
  });

  it("holds the source chip inside the body", () => {
    expect(resolve(rules, [card, body, source], "max-width")?.value).toBe(
      "100%",
    );
  });

  it("ellipsizes a long kind label the same way", () => {
    const chain = [card, body, head, kind];
    expect(resolve(rules, chain, "overflow")?.value).toBe("hidden");
    expect(resolve(rules, chain, "min-width")?.value).toBe("0");
  });

  it("wraps the message rather than widening the card", () => {
    const message = el("notification-card__message tag:div");
    expect(resolve(rules, [card, body, message], "overflow-wrap")?.value).toBe(
      "anywhere",
    );
  });
});
