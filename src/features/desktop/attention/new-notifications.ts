import type { Notification } from "src/types";

// Which inbox notifications get a system notification: unread ones that
// arrived while the app was running (made at most RECENT_MS before it
// started, for clocks that disagree a little), each once. Earlier ones are
// in the inbox and the badge already. Pure, for the tests.

export const RECENT_MS = 60_000;
/** A burst (a page shared with you and five mentions…) shows this many. */
export const MAX_AT_ONCE = 3;

export function newNotifications(
  all: Notification[],
  shown: Set<string>,
  startedAt: number,
): Notification[] {
  const fresh: Notification[] = [];
  for (const n of all) {
    if (shown.has(n.id)) continue;
    shown.add(n.id);
    if (n.read || n.timestamp.getTime() < startedAt - RECENT_MS) continue;
    fresh.push(n);
  }
  return fresh.slice(0, MAX_AT_ONCE);
}
