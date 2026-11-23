import { describe, expect, it } from "vitest";
import { toInviteResult } from "./chat-invite";

// What the invite says it did. The server used to answer with a row count,
// which the app threw away — so inviting people the room's scope does not
// allow added nobody and reported success (migration 060).

describe("reading what an invite did", () => {
  it("takes the three lists the server sends", () => {
    expect(
      toInviteResult({ added: ["a"], already: ["b"], skipped: ["c", "d"] }),
    ).toEqual({ added: ["a"], already: ["b"], skipped: ["c", "d"] });
  });

  it("reports nothing rather than guessing, for an older server's count", () => {
    // A number says two people were added but not which: better to say
    // nothing than to name the wrong ones.
    expect(toInviteResult(2)).toEqual({ added: [], already: [], skipped: [] });
  });

  it("survives a missing answer", () => {
    expect(toInviteResult(null)).toEqual({
      added: [],
      already: [],
      skipped: [],
    });
    expect(toInviteResult(undefined).skipped).toEqual([]);
  });

  it("keeps only the ids, not whatever else is in the list", () => {
    expect(
      toInviteResult({ added: ["a", 7, null, "b"], skipped: "nope" }),
    ).toEqual({ added: ["a", "b"], already: [], skipped: [] });
  });
});
