import type { HocuspocusProvider } from "@hocuspocus/provider";

// What Folio knows about getting your changes to the server, for the status
// pill in the toolbar (SyncStatus):
//
//   • open pages — each page's HocuspocusProvider (useCollabDoc): connected
//     or not, and how many edits the server hasn't confirmed yet
//   • the background sender (OfflineDocSync) — sending or not
//   • whether Folio's servers answer at all. The browser's online flag stays
//     true on Wi-Fi without internet, or when the servers are down. So a
//     failed request or a dropped page connection starts a check (a tiny
//     request to Supabase); if it fails, Folio counts as offline and checks
//     again every RETRY_MS until it answers.
//
// Pages with unsent edits (IndexedDB dirty flags) and queued saves (React
// Query's paused mutations) are read by SyncStatus itself.

export interface SyncSnapshot {
  /** The browser says online, but Folio's servers don't answer. */
  unreachable: boolean;
  /** Edits are on their way: an open page is connected with unconfirmed
   *  edits, or the background sender is running. */
  sending: boolean;
}

const PROBE_URL = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/health`;
const PROBE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
const PROBE_TIMEOUT_MS = 6000;
const RETRY_MS = 15_000;

interface TrackedProvider {
  connected: boolean;
  unsynced: number;
}

const tracked = new Map<HocuspocusProvider, TrackedProvider>();
let backgroundSending = 0;
let unreachable = false;
let snapshot: SyncSnapshot = { unreachable: false, sending: false };
const listeners = new Set<() => void>();

function emit() {
  const sending =
    backgroundSending > 0 ||
    [...tracked.values()].some((t) => t.connected && t.unsynced > 0);
  if (sending === snapshot.sending && unreachable === snapshot.unreachable) {
    return;
  }
  snapshot = { unreachable, sending };
  listeners.forEach((l) => l());
}

export function subscribeSyncStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSyncSnapshot(): SyncSnapshot {
  return snapshot;
}

// ── Open pages ──────────────────────────────────────────────────────────

/** Follows an open page's connection; call the returned function on close. */
export function trackProvider(provider: HocuspocusProvider): () => void {
  const entry: TrackedProvider = {
    connected: false,
    unsynced: provider.unsyncedChanges,
  };
  tracked.set(provider, entry);

  const onStatus = ({ status }: { status: string }) => {
    entry.connected = status === "connected";
    if (status === "disconnected") checkReachable();
    emit();
  };
  const onUnsynced = ({ number }: { number: number }) => {
    entry.unsynced = number;
    emit();
  };
  provider.on("status", onStatus);
  provider.on("unsyncedChanges", onUnsynced);
  emit();

  return () => {
    provider.off("status", onStatus);
    provider.off("unsyncedChanges", onUnsynced);
    tracked.delete(provider);
    emit();
  };
}

// ── Background sender ───────────────────────────────────────────────────

/** Runs `send` and counts as "sending" meanwhile (OfflineDocSync). */
export async function whileSending<T>(send: () => Promise<T>): Promise<T> {
  backgroundSending++;
  emit();
  try {
    return await send();
  } finally {
    backgroundSending--;
    emit();
  }
}

const SYNC_NOW_EVENT = "folio:sync-now";

/** "Try now" in the status popover: OfflineDocSync sends right away. */
export function requestSyncNow(): void {
  window.dispatchEvent(new Event(SYNC_NOW_EVENT));
}

export function onSyncNowRequested(run: () => void): () => void {
  window.addEventListener(SYNC_NOW_EVENT, run);
  return () => window.removeEventListener(SYNC_NOW_EVENT, run);
}

// ── Can Folio's servers be reached? ─────────────────────────────────────

let probing = false;
let retryTimer: number | null = null;

function setUnreachable(value: boolean) {
  unreachable = value;
  if (retryTimer !== null) {
    window.clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (value) retryTimer = window.setTimeout(checkReachable, RETRY_MS);
  emit();
}

async function probe(): Promise<boolean> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    // Any HTTP answer, even an error status, means the server is there.
    await fetch(PROBE_URL, {
      headers: { apikey: PROBE_KEY },
      cache: "no-store",
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

/** Something failed to reach the server: check whether Folio is reachable.
 *  Does nothing while the browser already says offline. */
export function checkReachable(): void {
  if (!navigator.onLine || probing) return;
  probing = true;
  void probe().then((ok) => {
    probing = false;
    // The browser may have gone offline meanwhile; that state wins.
    setUnreachable(navigator.onLine && !ok);
  });
}

/** A request just succeeded: Folio is reachable. */
export function markReachable(): void {
  if (unreachable) setUnreachable(false);
}

/** True for errors where the request never reached the server (as opposed
 *  to the server answering with an error). Messages differ by browser. */
export function isNetworkError(error: unknown): boolean {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error ?? "");
  return /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(
    message,
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("online", checkReachable);
  window.addEventListener("offline", () => setUnreachable(false));
}
