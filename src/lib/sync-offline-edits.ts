import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { collabToken } from "src/lib/collab-token";
import {
  isDocOpen,
  listDirtyPageIds,
  loadDocCache,
  markDocClean,
  saveDocCache,
} from "src/lib/offline-doc-cache";

// Sends page edits made offline without waiting for the page to be opened
// again.
//
// useCollabDoc marks a page's local copy "dirty" when you edit it while not
// connected. If you're still on that page when the connection comes back, its
// own provider sends the edits. If you'd already left it, nothing did — until
// the next time you opened it. This goes through every dirty page (not open
// in this tab) and, for each:
//
//   1. opens a connection to the page with an empty doc, no editor;
//   2. once the server's copy has arrived, applies the local copy on top —
//      Yjs merges, so only what the server is missing goes out;
//   3. waits until the server has acknowledged everything
//      (provider.hasUnsyncedChanges is false), saves the merged copy, marks
//      it clean and disconnects.
//
// One page at a time; a page that doesn't finish in PAGE_TIMEOUT_MS (server
// unreachable, no access any more) stays dirty and is tried again next run.

const HOCUSPOCUS_URL = import.meta.env.VITE_HOCUSPOCUS_URL as
  | string
  | undefined;
const PAGE_TIMEOUT_MS = 20_000;

type Outcome = "synced" | "skipped" | "failed";

async function syncPage(
  personId: string,
  pageId: string,
  token: string,
): Promise<Outcome> {
  const { update, dirty } = await loadDocCache(personId, pageId);
  if (!dirty) return "skipped";
  if (!update) {
    // Marked dirty but no copy to send: nothing to deliver.
    markDocClean(personId, pageId);
    return "skipped";
  }

  return new Promise<Outcome>((resolve) => {
    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: HOCUSPOCUS_URL!,
      name: `page:${pageId}`,
      document: ydoc,
      // Current at connect time: the one passed in may have expired.
      token: () => collabToken(token),
    });

    let done = false;
    let applied = false;

    const finish = (outcome: Outcome) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      provider.off("synced", onSynced);
      provider.off("unsyncedChanges", onUnsyncedChanges);
      provider.off("authenticationFailed", onAuthenticationFailed);
      provider.destroy();
      ydoc.destroy();
      resolve(outcome);
    };

    // Delivered = the local copy is applied and the server has acknowledged
    // every update that produced (none at all if it already had them).
    const finishIfDelivered = () => {
      if (!applied || provider.hasUnsyncedChanges) return;
      saveDocCache(personId, pageId, Y.encodeStateAsUpdate(ydoc));
      markDocClean(personId, pageId);
      finish("synced");
    };

    const onSynced = (data?: { state?: boolean }) => {
      if (data?.state === false || applied) return;
      applied = true;
      // A local change (no origin): the provider sends it as an update.
      Y.applyUpdate(ydoc, update);
      finishIfDelivered();
    };
    const onUnsyncedChanges = () => finishIfDelivered();
    const onAuthenticationFailed = () => finish("failed");

    provider.on("synced", onSynced);
    provider.on("unsyncedChanges", onUnsyncedChanges);
    provider.on("authenticationFailed", onAuthenticationFailed);

    const timer = window.setTimeout(() => finish("failed"), PAGE_TIMEOUT_MS);
  });
}

let running = false;

/** Sends every dirty page this person left before reconnecting. Resolves
 *  with how many pages were delivered. Safe to call often: it returns at
 *  once when offline, already running, or another tab is doing it. */
export async function syncOfflineEdits(
  personId: string,
  token: string,
): Promise<number> {
  if (running || !HOCUSPOCUS_URL || !navigator.onLine) return 0;
  running = true;

  const run = async () => {
    let synced = 0;
    for (const pageId of await listDirtyPageIds(personId)) {
      if (!navigator.onLine) break;
      if (isDocOpen(pageId)) continue;
      if ((await syncPage(personId, pageId, token)) === "synced") synced++;
    }
    return synced;
  };

  try {
    // One tab at a time when the browser supports it; the others skip.
    if (navigator.locks) {
      return await navigator.locks.request(
        "folio-offline-sync",
        { ifAvailable: true },
        (lock) => (lock ? run() : 0),
      );
    }
    return await run();
  } finally {
    running = false;
  }
}
