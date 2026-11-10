import { useEffect } from "react";
import { onlineManager, useQueryClient } from "@tanstack/react-query";
import { createPage } from "src/api/pages";
import { queryKeys } from "src/lib/queryKeys";
import { localPages, removeLocalPage } from "src/lib/local-pages";
import { requestSyncNow } from "src/lib/sync-status";
import {
  isNetworkError,
  isOnline,
  reportNetworkFailure,
} from "src/lib/connectivity";

// Sends pages created offline (src/lib/local-pages.ts) once the server can
// be reached: on start, whenever the browser comes back online, and every
// RETRY_MS while some are still waiting (a try that failed — server waking
// up, network not ready yet — used to wait for the next reload), and when
// the server answers again after a lost connection (connectivity.ts). Once one
// is created, the edits made in it offline are sent right away
// (requestSyncNow) instead of at OfflineDocSync's next timed run.
// Mount once, next to ChatOutboxSync. Renders nothing.
const RETRY_MS = 30_000;
export function PageOutboxSync() {
  const qc = useQueryClient();

  useEffect(() => {
    let running = false;
    const flush = async () => {
      if (running || !isOnline()) return;
      running = true;
      let sent = false;
      for (const page of localPages()) {
        try {
          await createPage(page);
          removeLocalPage(page.id);
          sent = true;
        } catch (error) {
          // Already there (an earlier try got through): done with it.
          if (String(error).includes("duplicate")) {
            removeLocalPage(page.id);
            sent = true;
          } else if (isNetworkError(error)) {
            // Not reachable after all: wait for it (connectivity.ts).
            reportNetworkFailure();
            break;
          }
          // Otherwise keep it for the next try.
        }
      }
      running = false;
      if (sent) {
        void qc.invalidateQueries({ queryKey: queryKeys.pages.all });
        requestSyncNow();
      }
    };

    void flush();
    window.addEventListener("online", flush);
    // The server answering again (connectivity.ts) counts as back online.
    const unsubscribe = onlineManager.subscribe((online) => {
      if (online) void flush();
    });
    const id = window.setInterval(() => {
      if (localPages().length > 0) void flush();
    }, RETRY_MS);
    return () => {
      window.removeEventListener("online", flush);
      unsubscribe();
      window.clearInterval(id);
    };
  }, [qc]);

  return null;
}
