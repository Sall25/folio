// Local copies of collaborative page docs, so pages you've opened on this
// device still open (and stay editable) while offline.
//
// Per person + page, two IndexedDB keys:
//   doc:<personId>:<pageId>    the full Yjs state (Y.encodeStateAsUpdate)
//   dirty:<personId>:<pageId>  true when it holds edits the server hasn't
//                              received yet (made while offline, or while the
//                              connection was down)
//
// Keyed by person so a shared device never serves one account's pages to
// another. Every call swallows storage errors (private mode, quota): offline
// copies are a convenience, never load-bearing.

const DB_NAME = "folio-offline";
const STORE = "docs";

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
  // A failed open can be retried later (e.g. storage freed up).
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function request<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = run(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

const docKey = (personId: string, pageId: string) =>
  `doc:${personId}:${pageId}`;
const dirtyKey = (personId: string, pageId: string) =>
  `dirty:${personId}:${pageId}`;

export async function loadDocCache(
  personId: string,
  pageId: string,
): Promise<{ update: Uint8Array | null; dirty: boolean }> {
  try {
    const [update, dirty] = await Promise.all([
      request<unknown>("readonly", (s) => s.get(docKey(personId, pageId))),
      request<unknown>("readonly", (s) => s.get(dirtyKey(personId, pageId))),
    ]);
    return {
      update: update instanceof Uint8Array ? update : null,
      dirty: dirty === true,
    };
  } catch {
    return { update: null, dirty: false };
  }
}

export function saveDocCache(
  personId: string,
  pageId: string,
  update: Uint8Array,
): void {
  request("readwrite", (s) => s.put(update, docKey(personId, pageId))).catch(
    () => {},
  );
}

export function markDocDirty(personId: string, pageId: string): void {
  request("readwrite", (s) => s.put(true, dirtyKey(personId, pageId))).catch(
    () => {},
  );
}

export function markDocClean(personId: string, pageId: string): void {
  request("readwrite", (s) => s.delete(dirtyKey(personId, pageId))).catch(
    () => {},
  );
}

/** Drop the offline copies on this device — call on sign-out. Resolves
 *  once the wipe is written (so a reload right after can't interrupt it).
 *
 *  `keepUnsentOf(personId)` returning true keeps that person's UNSENT pages
 *  (the copy and its dirty flag) — edits nobody else has, which a sign-out
 *  they didn't ask for must not destroy. Everything else is dropped.
 *  Without it, everything goes. */
export async function clearOfflineDocCache(
  keepUnsentOf?: (personId: string) => boolean,
): Promise<void> {
  try {
    if (!keepUnsentOf) {
      await request("readwrite", (s) => s.clear());
      return;
    }
    const keys = await request<IDBValidKey[]>("readonly", (s) =>
      s.getAllKeys(),
    );
    // dirty:<person>:<page> → keep it and doc:<person>:<page>.
    const kept = new Set<string>();
    for (const k of keys) {
      if (typeof k !== "string" || !k.startsWith("dirty:")) continue;
      const rest = k.slice("dirty:".length);
      const personId = rest.slice(0, rest.indexOf(":"));
      if (!keepUnsentOf(personId)) continue;
      kept.add(k);
      kept.add(`doc:${rest}`);
    }
    await Promise.all(
      keys
        .filter((k) => typeof k !== "string" || !kept.has(k))
        .map((k) => request("readwrite", (s) => s.delete(k))),
    );
  } catch {
    /* storage blocked: nothing to clear */
  }
}

/** True when some page on this device holds edits the server hasn't
 *  received yet (checked before signing out, which would discard them). */
export async function hasDirtyDocs(): Promise<boolean> {
  try {
    const keys = await request<IDBValidKey[]>("readonly", (s) =>
      s.getAllKeys(),
    );
    return keys.some((k) => typeof k === "string" && k.startsWith("dirty:"));
  } catch {
    return false;
  }
}

/** This person's pages whose local copy holds edits the server hasn't
 *  received yet (sync-offline-edits.ts sends them). */
export async function listDirtyPageIds(personId: string): Promise<string[]> {
  const prefix = `dirty:${personId}:`;
  try {
    const keys = await request<IDBValidKey[]>("readonly", (s) =>
      s.getAllKeys(),
    );
    return keys
      .filter((k): k is string => typeof k === "string" && k.startsWith(prefix))
      .map((k) => k.slice(prefix.length));
  } catch {
    return [];
  }
}

// ── Pages open in this tab ──────────────────────────────────────────────
// useCollabDoc registers the page it shows (a count: the same page can be
// open in the main view and a peek at once). The background sync skips
// those — the open page's own provider already delivers its edits.

const openCounts = new Map<string, number>();

/** Marks a page as open in this tab; call the returned function on close. */
export function noteDocOpened(pageId: string): () => void {
  openCounts.set(pageId, (openCounts.get(pageId) ?? 0) + 1);
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    const n = (openCounts.get(pageId) ?? 1) - 1;
    if (n > 0) openCounts.set(pageId, n);
    else openCounts.delete(pageId);
  };
}

export function isDocOpen(pageId: string): boolean {
  return openCounts.has(pageId);
}
