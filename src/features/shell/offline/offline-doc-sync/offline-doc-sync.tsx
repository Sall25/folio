import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "src/hooks/use-session";
import { usePagesBase } from "src/hooks/use-pages";
import { syncOfflineEdits } from "src/lib/sync-offline-edits";
import { downloadOfflinePages } from "src/lib/download-offline-pages";
import { pruneDocCache } from "src/lib/offline-doc-cache";
import { keptPageIds, useKeepChoices } from "src/lib/offline-keep";
import { requestPersistentStorage } from "src/lib/offline-storage";
import {
  onSyncNowRequested,
  requestSyncNow,
  whileSending,
} from "src/lib/sync-status";
import { useToast } from "src/features/shell/toast";
import type { Page } from "src/types";

// Keeps this device's page copies in step with the server, in the
// background. Each run:
//
//   1. sends page edits made offline, without waiting for those pages to be
//      opened again (sync-offline-edits.ts). Meanwhile the status pill says
//      "Saving…" (whileSending);
//   2. downloads or refreshes the pages marked "Available offline"
//      (download-offline-pages.ts, offline-keep.ts);
//   3. drops the oldest page copies beyond the limit, never the kept ones
//      (pruneDocCache).
//
// Runs when the app starts, when the browser comes back online, every few
// minutes — which catches "online but the server was down" — when "Try now"
// is clicked in the sync status popover, and when the set of kept pages
// changes. On the first run it also asks the browser to keep Folio's storage
// (offline-storage.ts). Renders nothing.
const RETRY_MS = 3 * 60 * 1000;
const allPages = (pages: Page[]) => pages;

export function OfflineDocSync() {
  const { t } = useTranslation();
  const { show } = useToast();
  const { session } = useSession();
  const personId = session?.user?.id ?? null;
  const token = session?.access_token ?? null;

  // Every page this person can see (database rows included), and which of
  // them to keep. Read by each run through a ref, so the loop itself doesn't
  // restart when the pages list refetches.
  const { data: pages } = usePagesBase(allPages);
  const choices = useKeepChoices(personId);
  const keptIds = useMemo(
    () => keptPageIds(pages ?? [], choices),
    [pages, choices],
  );
  const keptRef = useRef<string[]>(keptIds);
  useEffect(() => {
    keptRef.current = keptIds;
  }, [keptIds]);

  useEffect(() => {
    if (!personId || !token) return;
    let cancelled = false;

    void requestPersistentStorage();

    const run = async () => {
      const count = await whileSending(() =>
        syncOfflineEdits(personId, token),
      );
      if (!cancelled && count > 0) {
        show(
          t("offline.syncedPages", {
            count,
            defaultValue:
              "Edits made offline on {{count}} pages are now synced.",
          }),
          "success",
        );
      }
      const kept = keptRef.current;
      await downloadOfflinePages(personId, token, kept);
      const keptSet = new Set(kept);
      await pruneDocCache(personId, undefined, (id) => keptSet.has(id));
    };
    const runSoon = () => void run();

    runSoon();
    window.addEventListener("online", runSoon);
    const stopSyncNow = onSyncNowRequested(runSoon);
    const id = window.setInterval(runSoon, RETRY_MS);
    return () => {
      cancelled = true;
      window.removeEventListener("online", runSoon);
      stopSyncNow();
      window.clearInterval(id);
    };
  }, [personId, token, show, t]);

  // A page or teamspace was just marked "Available offline" (or the pages
  // list arrived): download now rather than at the next timed run.
  const keptKey = keptIds.join(",");
  useEffect(() => {
    if (!keptKey) return;
    const id = window.setTimeout(requestSyncNow, 500);
    return () => window.clearTimeout(id);
  }, [keptKey]);

  return null;
}
