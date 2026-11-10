import { onlineManager } from "@tanstack/react-query";

// Whether Folio can reach its server — not just whether the computer has a
// network. The browser's navigator.onLine only knows the second: it stays
// true with Wi-Fi off when another network adapter is up (a VPN, Hyper-V or
// WSL's virtual adapter, very common on Windows), and in the desktop app it
// often never changes at all. React Query trusted it, so offline page
// writes weren't held: they were sent, failed, and were undone.
//
// So a request that fails for lack of a connection says so
// (reportNetworkFailure): React Query is told we're offline — writes wait,
// queued, and are saved with the cache — and the server is tried every few
// seconds until it answers, then everything waiting goes out. The browser's
// own online/offline events still count too (React Query listens to them).

const NETWORK_FAILURE =
  /failed to fetch|load failed|networkerror|network error|fetch failed|network request failed|err_internet_disconnected|err_name_not_resolved|err_network_changed|err_connection/i;

/** A request that failed because the server couldn't be reached (as
 *  opposed to one the server refused). Supabase returns these as an error
 *  whose message is the browser's ("TypeError: Failed to fetch"). */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
  return NETWORK_FAILURE.test(message);
}

/** Folio thinks it can reach the server. */
export function isOnline(): boolean {
  return (
    onlineManager.isOnline() &&
    (typeof navigator === "undefined" || navigator.onLine !== false)
  );
}

const PROBE_MS = 5000;
const SERVER = import.meta.env?.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;
let probing = false;

/** Any answer from the server, even a refusal, means it's reachable. */
async function serverAnswers(): Promise<boolean> {
  try {
    await fetch(`${SERVER}/auth/v1/health`, {
      headers: KEY ? { apikey: KEY } : undefined,
      cache: "no-store",
    });
    return true;
  } catch {
    return false;
  }
}

function probe() {
  if (probing || !SERVER) return;
  probing = true;
  const tick = async () => {
    // Back by another way (the browser's "online" event): done.
    if (onlineManager.isOnline()) {
      probing = false;
      return;
    }
    if (await serverAnswers()) {
      probing = false;
      onlineManager.setOnline(true);
      return;
    }
    setTimeout(tick, PROBE_MS);
  };
  setTimeout(tick, PROBE_MS);
}

/** A request just failed for lack of a connection: offline until the
 *  server answers again. */
export function reportNetworkFailure() {
  if (onlineManager.isOnline()) onlineManager.setOnline(false);
  probe();
}

/** For page writes: try again — after waiting for the connection — when
 *  the failure was the connection, never when the server said no. */
export function retryWhenOffline(_failureCount: number, error: unknown) {
  if (!isNetworkError(error)) return false;
  reportNetworkFailure();
  return true;
}

export const RETRY_DELAY_MS = 1000;
