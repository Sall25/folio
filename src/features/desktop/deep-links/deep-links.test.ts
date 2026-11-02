import { describe, expect, it } from "vitest";
import { parseDeepLink } from "./parse-deep-link";
import {
  MAX_AT_ONCE,
  RECENT_MS,
  newNotifications,
} from "../attention/new-notifications";
import type { Notification } from "src/types";

// folio:// links: the end of a sign-in in the browser, and app paths. A
// wrong reading would drop the sign-in or open the wrong page.

describe("folio:// links", () => {
  it("reads the sign-in code", () => {
    expect(parseDeepLink("folio://auth/callback?code=abc-123")).toEqual({
      kind: "auth",
      code: "abc-123",
      error: null,
    });
  });

  it("reads a sign-in error, from the query or after the #", () => {
    expect(
      parseDeepLink(
        "folio://auth/callback?error=access_denied&error_description=Cancelled",
      ),
    ).toMatchObject({ kind: "auth", error: "Cancelled", code: null });
    expect(
      parseDeepLink("folio://auth/callback#error=server_error"),
    ).toMatchObject({ kind: "auth", error: "server_error" });
  });

  it("maps a link to the web app's path", () => {
    expect(parseDeepLink("folio://page/p1")).toEqual({
      kind: "path",
      path: "/page/p1",
      search: {},
    });
    expect(parseDeepLink("folio://t/ts1/chat/r1/?m=5")).toEqual({
      kind: "path",
      path: "/t/ts1/chat/r1",
      search: { m: "5" },
    });
    expect(parseDeepLink("FOLIO:///inbox")).toMatchObject({ path: "/inbox" });
    expect(parseDeepLink("folio://")).toMatchObject({ path: "/" });
  });

  it("refuses other schemes and odd paths", () => {
    expect(parseDeepLink("https://folio.app/page/p1")).toBeNull();
    expect(parseDeepLink("folio://page/../../etc")).toBeNull();
    expect(parseDeepLink("folio://page//evil.com")).toBeNull();
  });
});

describe("which notifications reach the system", () => {
  const started = 1_000_000_000_000;
  const n = (id: string, at: number, read = false) =>
    ({ id, timestamp: new Date(at), read, title: id, message: "" }) as Notification;

  it("new unread ones, each once", () => {
    const shown = new Set<string>();
    const list = [n("a", started + 10)];
    expect(newNotifications(list, shown, started).map((x) => x.id)).toEqual([
      "a",
    ]);
    expect(newNotifications(list, shown, started)).toEqual([]);
  });

  it("not the ones from before the app started, nor read ones", () => {
    const shown = new Set<string>();
    expect(
      newNotifications(
        [n("old", started - RECENT_MS - 1), n("read", started + 5, true)],
        shown,
        started,
      ),
    ).toEqual([]);
  });

  it("a burst shows a few", () => {
    const list = Array.from({ length: 8 }, (_, i) => n(`b${i}`, started + i));
    expect(newNotifications(list, new Set(), started)).toHaveLength(
      MAX_AT_ONCE,
    );
  });
});
