import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Query } from "@tanstack/react-query";
import { clearOfflineDocCache } from "src/lib/offline-doc-cache";
import { findJsonUnsafeCached } from "src/lib/json-safe";

// Saves React Query's cache (pages list, threads, people, roles…) to
// IndexedDB so the app starts with data after a reload — instantly online,
// and at all offline.
//
// Stored in its own tiny IndexedDB key/value store (localStorage caps at
// ~5 MB and the pages list carries every page's content).

const DB_NAME = "folio-query-cache";
const STORE = "kv";
const PERSIST_KEY = "react-query";
const OWNER_KEY = "folio-cache-owner";

/** How long a saved cache is trusted. Also used as the default gcTime, so
 *  restored queries aren't garbage-collected right away. */
export const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days

/** Bump when a cached shape changes incompatibly — old caches are dropped.
 *  v2: caches saved before non-JSON data was skipped (shouldPersistQuery)
 *  held chat block/row refs as `{}`, which crashed the chat room after a
 *  reload. */
export const QUERY_CACHE_BUSTER = "v2";

// Query keys (first segment) never written to disk:
//   notifications — Notification.timestamp is a Date, which JSON turns into a
//                   string
//   session       — the Supabase session (tokens) already lives in the SDK's
//                   own storage; a restored copy would be stale, and
//                   staleTime: Infinity would keep serving it
const NOT_PERSISTED = new Set<string>(["notifications", "session"]);

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function run<T>(
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = op(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

// The async storage interface the persister expects. Failures (private mode,
// quota) degrade to "no saved cache" instead of breaking the app.
const idbStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await run<unknown>("readonly", (s) => s.get(key));
      return typeof value === "string" ? value : null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await run("readwrite", (s) => s.put(value, key));
    } catch {
      /* ignore */
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await run("readwrite", (s) => s.delete(key));
    } catch {
      /* ignore */
    }
  },
};

export const queryPersister = createAsyncStoragePersister({
  storage: idbStorage,
  key: PERSIST_KEY,
  throttleTime: 1000,
});

/** Which queries get written to disk: successful ones whose data survives
 *  the trip through JSON, minus the denylist. */
export function shouldPersistQuery(query: Query): boolean {
  if (query.state.status !== "success") return false;
  const head = query.queryKey[0];
  if (typeof head === "string" && NOT_PERSISTED.has(head)) return false;
  // The cache is saved as JSON. Data JSON can't hold exactly (a Map, a Set,
  // a Date…) would come back as something else after a reload and crash
  // whatever reads it — the chat room's Map of block refs came back as `{}`.
  // Such queries are fetched again instead of restored. In development the
  // console names the query and the value, so it can be made JSON-safe.
  const unsafe = findJsonUnsafeCached(query.state.data);
  if (unsafe) {
    warnNotPersisted(query.queryHash, unsafe);
    return false;
  }
  return true;
}

const warned = new Set<string>();

function warnNotPersisted(queryHash: string, where: string) {
  if (!import.meta.env.DEV || warned.has(queryHash)) return;
  warned.add(queryHash);
  console.warn(
    `[query cache] ${queryHash} isn't saved for offline use: ${where} can't be stored as JSON. It's fetched again after a reload.`,
  );
}

// ── Unsent edits survive a sign-out nobody asked for ────────────────────
// When the session ends on its own (Log out on another device — Supabase
// signs out everywhere —, a password change, a revoked session, Log out in
// another tab), this device may still hold page edits that never reached the
// server. Those are kept (per person; nobody else can open them) and the
// sign-in screen asks the person to sign in again to send them. Only a Log
// out clicked here (already confirmed in SignOutHost) drops them.

const UNSENT_KEY = "folio-unsent-owner";

export interface UnsentOwner {
  personId: string;
  email: string | null;
}

/** Who left unsent edits on this device when they were signed out. */
export function readUnsentOwner(): UnsentOwner | null {
  try {
    const raw = localStorage.getItem(UNSENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as UnsentOwner) : null;
    return parsed?.personId ? parsed : null;
  } catch {
    return null;
  }
}

function writeUnsentOwner(owner: UnsentOwner | null): void {
  try {
    if (owner) localStorage.setItem(UNSENT_KEY, JSON.stringify(owner));
    else localStorage.removeItem(UNSENT_KEY);
  } catch {
    /* storage blocked */
  }
}

let signOutIntended = false;

/** Called by signOut() just before it signs out: this sign-out was asked
 *  for here, and its unsent edits (if any) were confirmed as discarded. */
export function markSignOutIntended(): void {
  signOutIntended = true;
}

/** True when the sign-out in progress came from this tab's Log out. */
export function isSignOutIntended(): boolean {
  return signOutIntended;
}

/** What a sign-out wipes. `personId` is who was signed in (null: unknown);
 *  `keepOwnUnsent` keeps their unsent edits too. Everyone else's unsent
 *  edits on this device are always kept. */
export interface SignOutWipe {
  personId: string | null;
  email?: string | null;
  keepOwnUnsent: boolean;
}

const keepFor =
  (wipe: SignOutWipe | undefined) =>
  (personId: string): boolean =>
    !wipe?.personId || personId !== wipe.personId || wipe.keepOwnUnsent;

/**
 * Makes sure a saved cache belongs to whoever is signed in. When a different
 * person signs in on this device, the previous person's saved queries and
 * page copies are dropped (OfflineCacheGuard runs this before rendering) —
 * except edits someone hasn't sent yet, which wait for them to sign in again.
 */
export function claimOfflineCache(
  personId: string,
  clearQueries: () => void,
): void {
  let previous: string | null = null;
  try {
    previous = localStorage.getItem(OWNER_KEY);
  } catch {
    /* storage blocked */
  }
  if (previous && previous !== personId) {
    clearQueries();
    void queryPersister.removeClient();
    void clearOfflineDocCache(() => true);
  }
  // Back after an unasked sign-out: OfflineDocSync sends the edits now.
  if (readUnsentOwner()?.personId === personId) writeUnsentOwner(null);
  try {
    localStorage.setItem(OWNER_KEY, personId);
  } catch {
    /* storage blocked */
  }
}

/** Sign-out with nothing on screen to reload: drop the offline copies
 *  (queries + page docs) on this device, as `wipe` says. */
export function clearOfflineData(
  clearQueries: () => void,
  wipe?: SignOutWipe,
): void {
  clearQueries();
  void queryPersister.removeClient();
  void clearOfflineDocCache(keepFor(wipe));
  if (wipe?.keepOwnUnsent && wipe.personId) {
    writeUnsentOwner({ personId: wipe.personId, email: wipe.email ?? null });
  }
  try {
    localStorage.removeItem(OWNER_KEY);
  } catch {
    /* storage blocked */
  }
}

let leaving = false;

/**
 * After signing out (here or in another tab): wipe this device's offline
 * data — saved queries and page copies — then reload: at "/", the landing
 * page, or at "/signin" when unsent edits were kept, so the person sees why
 * to sign in again.
 *
 * A full reload rather than re-rendering in place: emptying the query cache
 * doesn't re-render the screens reading it (the app just sat there), and a
 * reload also closes every live connection and resets all in-memory state,
 * so nothing of the previous account survives. Runs once even if called
 * twice (sign-out + its auth event).
 */
export async function wipeAndReloadHome(
  clearQueries: () => void,
  wipe?: SignOutWipe,
) {
  if (leaving) return;
  leaving = true;
  clearQueries();
  await Promise.allSettled([
    queryPersister.removeClient(),
    clearOfflineDocCache(keepFor(wipe)),
  ]);
  const keptOwn = Boolean(wipe?.keepOwnUnsent && wipe.personId);
  if (keptOwn && wipe?.personId) {
    writeUnsentOwner({ personId: wipe.personId, email: wipe.email ?? null });
  }
  try {
    localStorage.removeItem(OWNER_KEY);
  } catch {
    /* storage blocked */
  }
  window.location.replace(keptOwn ? "/signin" : "/");
}
