import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { useSession } from "src/hooks/use-session";
import type { Page } from "src/types";
import {
  loadDocCache,
  markDocClean,
  markDocDirty,
  noteDocOpened,
  saveDocCache,
} from "src/lib/offline-doc-cache";
import { trackProvider } from "src/lib/sync-status";
import { isLocalPage } from "src/lib/local-pages";
import { collabToken } from "src/lib/collab-token";

const HOCUSPOCUS_URL = import.meta.env.VITE_HOCUSPOCUS_URL;

if (!HOCUSPOCUS_URL) {
  throw new Error("VITE_HOCUSPOCUS_URL is not configured");
}

// Online but the server hasn't synced after this long (bad network, server
// down): open the local copy instead of showing the skeleton forever.
const SYNC_TIMEOUT_MS = 4000;
// Debounce for writing the local copy.
const SAVE_DELAY_MS = 400;
// After a sync, how long the connection must stay up before the local copy's
// unsent edits count as delivered.
const CLEAN_DELAY_MS = 1500;
// Transaction origin for applying the local copy (not a local edit).
const CACHE_ORIGIN = "offline-cache";
// The server refused the connection: try again after this, doubling each
// time up to AUTH_RETRY_MAX_MS. It refuses a page that doesn't exist yet
// (one created offline, still on its way: PageOutboxSync) and a token that
// can't be refreshed yet; neither lasts.
const AUTH_RETRY_MS = 3000;
const AUTH_RETRY_MAX_MS = 60_000;

/** Where the doc currently shown came from. */
export type CollabDocSource = "server" | "cache";

interface UseCollabDocResult {
  ydoc: Y.Doc | null;
  provider: HocuspocusProvider | null;
  /** The doc is ready to show — synced with the server, or opened from the
   *  local copy while offline. (Name kept for existing consumers.) */
  isSynced: boolean;
  source: CollabDocSource | null;
  /** Offline and this page was never opened on this device: nothing to show. */
  unavailableOffline: boolean;
  /** Online, but the server hasn't sent the page (no sync within
   *  SYNC_TIMEOUT_MS, or it refused the connection) and there's no local
   *  copy to open: say so and offer `retry`, instead of claiming we're
   *  offline or showing the skeleton forever. Clears by itself if the page
   *  arrives later. */
  stalled: boolean;
  /** Start over with a fresh connection. */
  retry: () => void;
}

// One Y.Doc + HocuspocusProvider per open page, with a local copy in
// IndexedDB so the page opens offline:
//
//   • online  → the server syncs as before; the synced doc is then saved
//               locally and kept up to date.
//   • offline (or no sync within SYNC_TIMEOUT_MS) → the local copy is applied
//               and the page opens from it. Edits land in the same doc, so
//               when the connection comes back the provider syncs them.
//   • edits made while not connected mark the copy "dirty"; if you leave the
//     page before reconnecting, OfflineDocSync sends them in the background
//     once online (sync-offline-edits.ts), and the next open merges the copy
//     back in too (even online), so those edits reach the server.
//
// The local copy is only applied when needed (offline, or dirty) — never on a
// normal online open. See the note on server restarts in the PR description.
export function useCollabDoc(page: Page | null): UseCollabDocResult {
  const { session } = useSession();
  const pageId = page?.id ?? null;
  const token = session?.access_token ?? null;
  const personId = session?.user?.id ?? null;
  const signedIn = token !== null;
  // Read at each connect (collabToken), so a refreshed token doesn't
  // rebuild the page's doc and connection.
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const [doc, setDoc] = useState<{
    ydoc: Y.Doc | null;
    provider: HocuspocusProvider | null;
  }>({ ydoc: null, provider: null });

  // Which provider's doc is ready, and from where. Keyed by provider so a
  // stale page's state never leaks into the next one (derived below).
  const [ready, setReady] = useState<{
    provider: HocuspocusProvider;
    source: CollabDocSource;
  } | null>(null);
  const [unavailableFor, setUnavailableFor] =
    useState<HocuspocusProvider | null>(null);
  const [stalledFor, setStalledFor] = useState<HocuspocusProvider | null>(null);
  // Bumped by retry(): a new provider, a new connection.
  const [attempt, setAttempt] = useState(0);

  // Creation AND lifecycle ownership both live here: each effect run owns
  // the provider it created, so StrictMode's mount → cleanup → mount
  // destroys the first instance and the remount connects a genuinely new
  // one (see git history for the full story).
  useEffect(() => {
    if (!pageId || !signedIn || !personId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDoc({ ydoc: null, provider: null });
      setReady(null);
      setUnavailableFor(null);
      setStalledFor(null);
      return;
    }

    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: HOCUSPOCUS_URL,
      name: `page:${pageId}`,
      document: ydoc,
      // A fresh token on every connect and reconnect.
      token: () => collabToken(tokenRef.current ?? ""),
    });
    // While open here, this provider delivers the page's edits; the
    // background sync leaves it alone.
    const closeDoc = noteDocOpened(pageId);
    // The sync status pill follows this connection.
    const untrack = trackProvider(provider);

    setDoc({ ydoc, provider });

    let disposed = false;
    // Connected and synced right now (edits go straight to the server).
    let liveSynced = false;
    // The doc shares the server's history: synced once, or opened from the
    // local copy (which came from the server). Before that nothing is saved
    // or marked — the doc may be empty.
    let hasLineage = false;
    let cachedUpdate: Uint8Array | null = null;
    let cacheApplied = false;
    let dirtyMarked = false;
    let saveTimer: number | null = null;
    let cleanTimer: number | null = null;
    let cacheLoaded = false;
    let fallbackWanted = false;
    let authFailures = 0;
    let authRetryTimer: number | null = null;

    const applyCache = () => {
      if (cacheApplied || !cachedUpdate) return;
      cacheApplied = true;
      hasLineage = true;
      Y.applyUpdate(ydoc, cachedUpdate, CACHE_ORIGIN);
    };

    // Open from the local copy (offline / server not answering).
    // Open from the local copy (offline / server not answering).
    const fallBackToCache = () => {
      if (disposed || liveSynced) return;
      if (!cacheLoaded) {
        fallbackWanted = true; // decide once the copy is read
        return;
      }
      applyCache();
      if (!cacheApplied && isLocalPage(pageId)) {
        // Created on this device and not on the server yet: this doc IS the
        // page's first version, nothing to overwrite. Open it empty.
        hasLineage = true;
      }
      if (cacheApplied || hasLineage) {
        setReady((prev) =>
          prev?.provider === provider ? prev : { provider, source: "cache" },
        );
      } else if (navigator.onLine) {
        // Online: the server is slow or refusing, not "not on this device".
        setStalledFor(provider);
      } else {
        setUnavailableFor(provider);
      }
    };

    const save = () => {
      saveTimer = null;
      if (disposed || !hasLineage) return;
      saveDocCache(personId, pageId, Y.encodeStateAsUpdate(ydoc));
    };
    const scheduleSave = () => {
      if (saveTimer !== null) window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(save, SAVE_DELAY_MS);
    };

    void loadDocCache(personId, pageId).then(({ update, dirty }) => {
      if (disposed) return;
      cachedUpdate = update;
      cacheLoaded = true;
      // Unsent edits from an earlier offline session: merge them now so the
      // provider delivers them on sync.
      if (dirty && update) {
        applyCache();
        dirtyMarked = true;
      }
      if (fallbackWanted || !navigator.onLine) fallBackToCache();
    });

    const timeout = window.setTimeout(fallBackToCache, SYNC_TIMEOUT_MS);
    const onOffline = () => fallBackToCache();
    window.addEventListener("offline", onOffline);
    // Back online: reconnect now rather than at the next backoff step.
    const onOnline = () => {
      if (!disposed && !liveSynced) void provider.connect();
    };
    window.addEventListener("online", onOnline);

    // Payload read defensively: only an explicit { state: false } means
    // "no longer synced".
    const handleSynced = (data?: { state?: boolean }) => {
      if (data?.state === false) {
        liveSynced = false;
        return;
      }
      liveSynced = true;
      hasLineage = true;
      authFailures = 0;
      setReady({ provider, source: "server" });
      setUnavailableFor((prev) => (prev === provider ? null : prev));
      setStalledFor((prev) => (prev === provider ? null : prev));
      scheduleSave();
      // Unsent edits went out with this sync — once the connection has held
      // for a moment, the local copy is no longer dirty.
      if (dirtyMarked) {
        if (cleanTimer !== null) window.clearTimeout(cleanTimer);
        cleanTimer = window.setTimeout(() => {
          cleanTimer = null;
          if (disposed || !liveSynced) return;
          dirtyMarked = false;
          markDocClean(personId, pageId);
        }, CLEAN_DELAY_MS);
      }
    };

    const handleStatus = (data?: { status?: string }) => {
      if (data?.status && data.status !== "connected") liveSynced = false;
    };

    const handleUpdate = (_update: Uint8Array, origin: unknown) => {
      if (!hasLineage) return;
      // A local edit while not connected: remember it must be delivered.
      if (
        !liveSynced &&
        origin !== provider &&
        origin !== CACHE_ORIGIN &&
        !dirtyMarked
      ) {
        dirtyMarked = true;
        markDocDirty(personId, pageId);
      }
      scheduleSave();
    };

    // The server refused the connection. Open the local copy now rather
    // than waiting out the timeout, and connect again later: the provider
    // won't on its own. Reconnecting the same provider keeps the doc and the
    // editor (no skeleton) and signs in with a fresh token.
    const handleAuthFailed = () => {
      fallBackToCache();
      if (disposed || authRetryTimer !== null) return;
      const delay = Math.min(
        AUTH_RETRY_MS * 2 ** authFailures,
        AUTH_RETRY_MAX_MS,
      );
      authFailures++;
      provider.disconnect();
      authRetryTimer = window.setTimeout(() => {
        authRetryTimer = null;
        if (!disposed && !liveSynced) void provider.connect();
      }, delay);
    };

    provider.on("synced", handleSynced);
    provider.on("status", handleStatus);
    provider.on("authenticationFailed", handleAuthFailed);
    ydoc.on("update", handleUpdate);

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      if (cleanTimer !== null) window.clearTimeout(cleanTimer);
      if (authRetryTimer !== null) window.clearTimeout(authRetryTimer);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      provider.off("synced", handleSynced);
      provider.off("status", handleStatus);
      provider.off("authenticationFailed", handleAuthFailed);
      ydoc.off("update", handleUpdate);
      // Flush a pending save before the doc goes away (offline edits!).
      if (saveTimer !== null) {
        window.clearTimeout(saveTimer);
        if (hasLineage) {
          saveDocCache(personId, pageId, Y.encodeStateAsUpdate(ydoc));
        }
      }
      untrack();
      provider.destroy();
      ydoc.destroy();
      closeDoc();
      setReady((prev) => (prev?.provider === provider ? null : prev));
      setUnavailableFor((prev) => (prev === provider ? null : prev));
      setStalledFor((prev) => (prev === provider ? null : prev));
    };
  }, [pageId, signedIn, personId, attempt]);

  const isSynced = ready !== null && ready.provider === doc.provider;
  const unavailableOffline =
    !isSynced && unavailableFor !== null && unavailableFor === doc.provider;
  const stalled =
    !isSynced &&
    !unavailableOffline &&
    stalledFor !== null &&
    stalledFor === doc.provider;
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    ydoc: doc.ydoc,
    provider: doc.provider,
    isSynced,
    source: ready && ready.provider === doc.provider ? ready.source : null,
    unavailableOffline,
    stalled,
    retry,
  };
}
