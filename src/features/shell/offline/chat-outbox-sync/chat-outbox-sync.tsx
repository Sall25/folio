import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "src/hooks/use-session";
import { flushChatOutbox } from "src/lib/chat-outbox";
import { onSyncNowRequested } from "src/lib/sync-status";

// Sends chat messages written offline (chat-outbox.ts) once Folio is
// reachable: when the app starts, when the browser comes back online, every
// RETRY_MS (which catches "online but the server was down"), and when "Try
// now" or a message's Retry is clicked. Renders nothing.
const RETRY_MS = 30 * 1000;

export function ChatOutboxSync() {
  const qc = useQueryClient();
  const { session } = useSession();
  const personId = session?.user?.id ?? null;

  useEffect(() => {
    if (!personId) return;
    const run = () => void flushChatOutbox(personId, qc);
    run();
    window.addEventListener("online", run);
    const stopSyncNow = onSyncNowRequested(run);
    const id = window.setInterval(run, RETRY_MS);
    return () => {
      window.removeEventListener("online", run);
      stopSyncNow();
      window.clearInterval(id);
    };
  }, [personId, qc]);

  return null;
}
