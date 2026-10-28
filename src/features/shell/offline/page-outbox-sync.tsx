import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createPage } from "src/api/pages";
import { queryKeys } from "src/lib/queryKeys";
import { localPages, removeLocalPage } from "src/lib/local-pages";

// Sends pages created offline (src/lib/local-pages.ts) once the server can
// be reached: on start and whenever the browser comes back online.
// Mount once, next to ChatOutboxSync. Renders nothing.
export function PageOutboxSync() {
  const qc = useQueryClient();

  useEffect(() => {
    let running = false;
    const flush = async () => {
      if (running || !navigator.onLine) return;
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
          }
          // Otherwise keep it for the next try.
        }
      }
      running = false;
      if (sent) void qc.invalidateQueries({ queryKey: queryKeys.pages.all });
    };

    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [qc]);

  return null;
}
