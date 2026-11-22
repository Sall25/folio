import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { linkDraft, pendingLinks } from "./link-draft-store";

// A link is drawn from the records, and a write takes a moment to come back
// — so between the two there was nothing on screen, the link made and no
// arrow to show for it. The store holds what was just written until the
// records say it themselves.

describe("a link just made", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("is there to draw straight away", () => {
    linkDraft.remember("kick", "deposit");
    expect(pendingLinks()).toEqual([{ from: "kick", to: "deposit" }]);
  });

  it("is let go of once the write has had its chance", () => {
    // Not kept for ever: a write that failed would leave an arrow with
    // nothing behind it, which is worse than no arrow.
    linkDraft.remember("kick", "deposit");
    vi.advanceTimersByTime(2400);
    expect(pendingLinks()).toHaveLength(1);
    vi.advanceTimersByTime(200);
    expect(pendingLinks()).toHaveLength(0);
  });

  it("holds several at once, and lets go of each in its turn", () => {
    linkDraft.remember("a", "b");
    vi.advanceTimersByTime(1000);
    linkDraft.remember("c", "d");
    vi.advanceTimersByTime(1600);
    expect(pendingLinks()).toEqual([{ from: "c", to: "d" }]);
    vi.advanceTimersByTime(1000);
    expect(pendingLinks()).toHaveLength(0);
  });
});
