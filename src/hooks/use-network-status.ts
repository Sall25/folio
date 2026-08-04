import { useEffect, useState, useRef } from "react";
import { supabase } from "src/api/supabase-client";

export type NetworkStatus = "online" | "offline" | "unstable";

// Tracks real connectivity to the backend, not just navigator.onLine.
// - offline: the browser reports no network.
// - unstable: browser is online but a lightweight backend ping failed/timed out
//   (the case that makes deletes silently fail and look like bugs).
// - online: browser online and the backend responded.
export function useNetworkStatus(pingIntervalMs = 20000): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(
    navigator.onLine ? "online" : "offline",
  );
  const consecutiveFails = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const onOnline = () => !cancelled && ping();
    const onOffline = () => !cancelled && setStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    async function ping() {
      if (!navigator.onLine) {
        setStatus("offline");
        return;
      }
      // A tiny, cheap request with a short timeout. HEAD on a known table via
      // PostgREST returns quickly; any response (even 401/empty) means the
      // backend is reachable.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      try {
        // count: 'exact' + head: true = no rows returned, minimal payload.
        const { error } = await supabase
          .from("people")
          .select("id", { count: "exact", head: true })
          .abortSignal(controller.signal);
        clearTimeout(timer);
        if (cancelled) return;
        if (error) {
          // A real query error (not a network failure) still means we reached
          // the server — treat as online. Network/abort failures throw instead.
          consecutiveFails.current = 0;
          setStatus("online");
        } else {
          consecutiveFails.current = 0;
          setStatus("online");
        }
      } catch {
        clearTimeout(timer);
        if (cancelled) return;
        // Timed out or connection refused/reset → the backend isn't reachable.
        consecutiveFails.current += 1;
        // One blip → unstable; persistent → still unstable (we keep the browser
        // "online" distinction for true offline via the event above).
        setStatus(navigator.onLine ? "unstable" : "offline");
      }
    }

    ping();
    const interval = setInterval(ping, pingIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [pingIntervalMs]);

  return status;
}
