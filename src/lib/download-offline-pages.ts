import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import {
  getDocSavedAt,
  isDocOpen,
  loadDocCache,
  saveDocCache,
} from "src/lib/offline-doc-cache";

// Downloads the pages someone marked "Available offline" (offline-keep.ts),
// so they open with no connection even if they were never opened on this
// device — and refreshes them while online so the copy isn't weeks old.
//
// For each kept page whose copy is missing or older than REFRESH_MS:
// open a connection with an empty doc (no editor), wait for the server's
// copy, save it locally, disconnect. Same mechanism as sync-offline-edits.ts,
// in the other direction.
//
// Skipped:
//   • pages open in this tab — their own connection keeps the copy fresh
//   • pages with unsent edits — sync-offline-edits.ts delivers those first,
//     and overwriting the copy before then would lose them
//   • a page that failed recently (no access any more, server not answering)
//     — tried again after RETRY_FAILED_MS
//
// One page at a time, at most MAX_PER_RUN per run, so a large teamspace is
// downloaded over a few runs instead of opening hundreds of connections.

const HOCUSPOCUS_URL = import.meta.env.VITE_HOCUSPOCUS_URL as
  | string
  | undefined;
const PAGE_TIMEOUT_MS = 20_000;
const REFRESH_MS = 30 * 60 * 1000;
const RETRY_FAILED_MS = 30 * 60 * 1000;
const MAX_PER_RUN = 40;

const failedAt = new Map<string, number>();

function downloadPage(
  personId: string,
  pageId: string,
  token: string,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: HOCUSPOCUS_URL!,
      name: `page:${pageId}`,
      document: ydoc,
      token,
    });

    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      provider.off("synced", onSynced);
      provider.off("authenticationFailed", onAuthenticationFailed);
      provider.destroy();
      ydoc.destroy();
      resolve(ok);
    };

    const onSynced = (data?: { state?: boolean }) => {
      if (data?.state === false) return;
      saveDocCache(personId, pageId, Y.encodeStateAsUpdate(ydoc));
      finish(true);
    };
    const onAuthenticationFailed = () => finish(false);

    provider.on("synced", onSynced);
    provider.on("authenticationFailed", onAuthenticationFailed);
    const timer = window.setTimeout(() => finish(false), PAGE_TIMEOUT_MS);
  });
}

async function needsDownload(personId: string, pageId: string) {
  if (isDocOpen(pageId)) return false;
  const failed = failedAt.get(pageId);
  if (failed && Date.now() - failed < RETRY_FAILED_MS) return false;
  const { dirty } = await loadDocCache(personId, pageId);
  if (dirty) return false;
  const savedAt = await getDocSavedAt(personId, pageId);
  return savedAt === null || Date.now() - savedAt > REFRESH_MS;
}

let running = false;

/** Downloads or refreshes the kept pages that need it. Resolves with how
 *  many were saved. Safe to call often: returns at once when offline,
 *  already running, or another tab is doing it. */
export async function downloadOfflinePages(
  personId: string,
  token: string,
  pageIds: string[],
): Promise<number> {
  if (running || !HOCUSPOCUS_URL || !navigator.onLine || !pageIds.length) {
    return 0;
  }
  running = true;

  const run = async () => {
    let saved = 0;
    let attempts = 0;
    for (const pageId of pageIds) {
      if (!navigator.onLine || attempts >= MAX_PER_RUN) break;
      if (!(await needsDownload(personId, pageId))) continue;
      attempts++;
      if (await downloadPage(personId, pageId, token)) {
        failedAt.delete(pageId);
        saved++;
      } else {
        failedAt.set(pageId, Date.now());
      }
    }
    return saved;
  };

  try {
    // Shares the background sender's lock: one tab at a time, and never
    // while that tab is sending offline edits.
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
