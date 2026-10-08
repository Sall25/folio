import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "src/hooks/use-session";
import { syncOfflineEdits } from "src/lib/sync-offline-edits";
import { pruneDocCache } from "src/lib/offline-doc-cache";
import { requestPersistentStorage } from "src/lib/offline-storage";
import { useToast } from "src/features/shell/toast";

// Sends page edits made offline as soon as Folio can, without waiting for
// those pages to be opened again (see sync-offline-edits.ts). Runs when the
// app starts, when the browser comes back online, and every few minutes —
// the last one catches "online but the server was down". After each run it
// drops the oldest page copies beyond the limit (pruneDocCache), and on the
// first run it asks the browser to keep Folio's storage (offline-storage.ts).
// Renders nothing.
const RETRY_MS = 3 * 60 * 1000;

export function OfflineDocSync() {
  const { t } = useTranslation();
  const { show } = useToast();
  const { session } = useSession();
  const personId = session?.user?.id ?? null;
  const token = session?.access_token ?? null;

  useEffect(() => {
    if (!personId || !token) return;
    let cancelled = false;

    void requestPersistentStorage();

    const run = () => {
      void syncOfflineEdits(personId, token).then((count) => {
        void pruneDocCache(personId);
        if (cancelled || count === 0) return;
        show(
          t("offline.syncedPages", {
            count,
            defaultValue: "Edits made offline on {{count}} pages are now synced.",
          }),
          "success",
        );
      });
    };

    run();
    window.addEventListener("online", run);
    const id = window.setInterval(run, RETRY_MS);
    return () => {
      cancelled = true;
      window.removeEventListener("online", run);
      window.clearInterval(id);
    };
  }, [personId, token, show, t]);

  return null;
}
