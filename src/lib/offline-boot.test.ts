import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  dehydrate,
  hydrate,
  onlineManager,
  QueryClient,
} from "@tanstack/react-query";
import { resumeQueuedWrites } from "./query-persistence";
import { retryWhenOffline } from "./connectivity";

// Opening the desktop app with no connection and an edit still to send.
//
// The app starts believing it has one: navigator.onLine stays true in the
// desktop app whatever the network does (connectivity.ts says so), and
// nothing has failed yet this launch. So the saved cache comes back, the
// page write saved with it is resumed, its request fails, and the write
// waits — correctly — for a connection to come back.
//
// What was wrong is that the app waited with it. The provider keeps
// everything behind its loading ring until its onSuccess settles, and that
// promise cannot settle before the network returns. A device with one
// unsent edit could not open at all until it was back online — which is
// the one moment being able to open offline is the whole point.

/** The provider's own chain: .then(onSuccess).finally(stop restoring). */
function bootWith(onSuccess: () => unknown): { opened: () => boolean } {
  let restoring = true;
  void Promise.resolve()
    .then(() => onSuccess())
    .finally(() => {
      restoring = false;
    });
  return { opened: () => !restoring };
}

const settle = (ms = 80) => new Promise((r) => setTimeout(r, ms));

/** A client holding one page write queued while the connection was down,
 *  saved and restored the way the app saves and restores it. */
async function clientWithAnUnsentEdit(): Promise<QueryClient> {
  onlineManager.setOnline(false);
  const wrote = new QueryClient();
  const write = wrote.getMutationCache().build(wrote, {
    mutationKey: ["pages", "patch"],
    mutationFn: async () => "sent",
  });
  void write.execute({ pageId: "p1" }).catch(() => {});
  await settle(10);
  expect(write.state.isPaused).toBe(true);

  const saved = dehydrate(wrote, {
    shouldDehydrateMutation: (m) => m.state.isPaused,
  });
  expect(saved.mutations).toHaveLength(1);

  // The next launch. The write gets its function back
  // (setPageWriteDefaults), and the app believes it is online.
  const next = new QueryClient();
  next.setMutationDefaults(["pages", "patch"], {
    mutationFn: async () => {
      throw new TypeError("Failed to fetch");
    },
    retry: retryWhenOffline,
    retryDelay: 5,
  });
  hydrate(next, saved);
  onlineManager.setOnline(true);
  return next;
}

describe("opening the desktop app offline with an edit still to send", () => {
  beforeEach(() => onlineManager.setOnline(true));
  afterEach(() => onlineManager.setOnline(true));

  it("waits for a connection that isn't there, if it is waited for", async () => {
    // The bug, as the boot used to run it. The write is resumed, fails for
    // want of a network, and pauses until one returns — so this promise
    // does not settle, and everything behind it stays behind it.
    const client = await clientWithAnUnsentEdit();
    const boot = bootWith(() => client.resumePausedMutations());
    await settle();
    expect(onlineManager.isOnline()).toBe(false); // the failure said so
    expect(boot.opened()).toBe(false);
  });

  it("opens anyway, because the boot no longer waits", async () => {
    const client = await clientWithAnUnsentEdit();
    const boot = bootWith(() => resumeQueuedWrites(client));
    await settle();
    expect(boot.opened()).toBe(true);
  });

  it("still holds the write, to send when the connection is back", async () => {
    // Not waiting is not dropping.
    const client = await clientWithAnUnsentEdit();
    resumeQueuedWrites(client);
    await settle();
    const waiting = client
      .getMutationCache()
      .getAll()
      .filter((m) => m.state.isPaused);
    expect(waiting).toHaveLength(1);
    expect(waiting[0].options.mutationKey).toEqual(["pages", "patch"]);
  });
});
