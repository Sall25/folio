import { offlineKv } from "src/lib/offline-kv";
import { isDesktopApp } from "src/lib/desktop";

// Local copies of collaborative page docs, so pages you've opened on this
// device still open (and stay editable) while offline.
//
// Per person + page, up to four keys:
//   doc:<personId>:<pageId>    the full Yjs state (Y.encodeStateAsUpdate)
//   dirty:<personId>:<pageId>  true when it holds edits the server hasn't
//                              received yet (made while offline, or while the
//                              connection was down)
//   seen:<personId>:<pageId>   when the copy was last saved (ms), so the
//                              oldest copies can be dropped (pruneDocCache)
//   synced:<personId>:<pageId> true once the copy holds the server's version
//                              of the page (saved after a sync with it, or
//                              built on such a copy). Only those can open a
//                              page before the server answers
//                              (opensFromCopyAtOnce): they share the
//                              server's history, so its sync merges into
//                              them. Copies saved before this key existed,
//                              and pages created on this device that haven't
//                              reached the server, don't have it.
//
// Keyed by person so a shared device never serves one account's pages to
// another. Every call swallows storage errors (private mode, quota): offline
// copies are a convenience, never load-bearing.

// Stored through offline-kv.ts: the "folio-offline" IndexedDB store on the
// web, files in the app's data folder in the desktop app (no browser
// clean-up, no quota).
const kv = offlineKv("offline-docs", "folio-offline", "docs");

const docKey = (personId: string, pageId: string) =>
  `doc:${personId}:${pageId}`;
const dirtyKey = (personId: string, pageId: string) =>
  `dirty:${personId}:${pageId}`;
const seenKey = (personId: string, pageId: string) =>
  `seen:${personId}:${pageId}`;
const syncedKey = (personId: string, pageId: string) =>
  `synced:${personId}:${pageId}`;

export interface DocCopy {
  update: Uint8Array | null;
  dirty: boolean;
  /** The copy holds the server's version of the page (see synced: above). */
  fromServer: boolean;
}

export async function loadDocCache(
  personId: string,
  pageId: string,
): Promise<DocCopy> {
  try {
    const [update, dirty, synced] = await Promise.all([
      kv.get(docKey(personId, pageId)),
      kv.get(dirtyKey(personId, pageId)),
      kv.get(syncedKey(personId, pageId)),
    ]);
    const copy = update instanceof Uint8Array ? update : null;
    return {
      update: copy,
      dirty: dirty === true,
      fromServer: copy !== null && synced === true,
    };
  } catch (e) {
    console.warn("[offline] cache read failed", e);
    return { update: null, dirty: false, fromServer: false };
  }
}

/** Saves the page's copy. `fromServer`: it holds the server's version
 *  (synced with it, or built on a copy that was) — marked once, never
 *  unmarked by a later save. */
export function saveDocCache(
  personId: string,
  pageId: string,
  update: Uint8Array,
  options: { fromServer?: boolean } = {},
): void {
  kv.put(docKey(personId, pageId), update).catch(() => {});
  kv.put(seenKey(personId, pageId), Date.now()).catch(() => {});
  if (options.fromServer) {
    kv.put(syncedKey(personId, pageId), true).catch(() => {});
  }
}

/** Desktop app: open the page from its copy on disk right away, and let the
 *  server's sync merge in when it arrives, instead of waiting for it. Only
 *  a copy of the server's version (fromServer) can: merging a copy with
 *  another history would double the page's content. The web keeps waiting
 *  for the server on a normal online open. */
export function opensFromCopyAtOnce(
  copy: DocCopy,
  desktop: boolean = isDesktopApp,
): boolean {
  return desktop && copy.update !== null && copy.fromServer;
}

// Told whenever a page gains or loses unsent edits (the sync status pill
// counts them).
const dirtyListeners = new Set<() => void>();

export function subscribeDirtyDocs(listener: () => void): () => void {
  dirtyListeners.add(listener);
  return () => {
    dirtyListeners.delete(listener);
  };
}

function notifyDirty() {
  dirtyListeners.forEach((l) => l());
}

export function markDocDirty(personId: string, pageId: string): void {
  kv.put(dirtyKey(personId, pageId), true).then(notifyDirty, () => {});
}

export function markDocClean(personId: string, pageId: string): void {
  kv.del(dirtyKey(personId, pageId)).then(notifyDirty, () => {});
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
      await kv.clear();
      return;
    }
    const keys = await kv.keys();
    // dirty:<person>:<page> → keep it and doc:<person>:<page>.
    const kept = new Set<string>();
    for (const k of keys) {
      if (!k.startsWith("dirty:")) continue;
      const rest = k.slice("dirty:".length);
      const personId = rest.slice(0, rest.indexOf(":"));
      if (!keepUnsentOf(personId)) continue;
      kept.add(k);
      kept.add(`doc:${rest}`);
      kept.add(`seen:${rest}`);
      kept.add(`synced:${rest}`);
    }
    await Promise.all(keys.filter((k) => !kept.has(k)).map((k) => kv.del(k)));
  } catch {
    /* storage blocked: nothing to clear */
  }
}

/** True when some page on this device holds edits the server hasn't
 *  received yet (checked before signing out, which would discard them). */
export async function hasDirtyDocs(): Promise<boolean> {
  try {
    const keys = await kv.keys();
    return keys.some((k) => k.startsWith("dirty:"));
  } catch {
    return false;
  }
}

/** This person's pages whose local copy holds edits the server hasn't
 *  received yet (sync-offline-edits.ts sends them). */
export async function listDirtyPageIds(personId: string): Promise<string[]> {
  const prefix = `dirty:${personId}:`;
  try {
    const keys = await kv.keys();
    return keys
      .filter((k) => k.startsWith(prefix))
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

// ── Keeping the store small ─────────────────────────────────────────────

/** How many page copies each person keeps on this device. The desktop app
 *  keeps them on disk, with room for many more. */
export const MAX_DOC_COPIES = isDesktopApp ? 5000 : 200;

/** When this page's local copy was last saved (ms), or null without one. */
export async function getDocSavedAt(
  personId: string,
  pageId: string,
): Promise<number | null> {
  try {
    const [update, seen] = await Promise.all([
      kv.get(docKey(personId, pageId)),
      kv.get(seenKey(personId, pageId)),
    ]);
    if (!(update instanceof Uint8Array)) return null;
    return typeof seen === "number" ? seen : 0;
  } catch {
    return null;
  }
}

/** Drops this person's oldest page copies beyond `max`, by when they were
 *  last saved. Never drops a page with unsent edits, one open in this tab,
 *  or one `kept` says to keep ("Available offline" — those don't count
 *  towards `max` either). Resolves with how many copies were dropped. */
export async function pruneDocCache(
  personId: string,
  max = MAX_DOC_COPIES,
  kept: (pageId: string) => boolean = () => false,
): Promise<number> {
  try {
    const keys = await kv.keys();
    const docPrefix = `doc:${personId}:`;
    const dirty = new Set(
      keys
        .filter((k) => k.startsWith(`dirty:${personId}:`))
        .map((k) => k.slice(`dirty:${personId}:`.length)),
    );
    const pageIds = keys
      .filter((k) => k.startsWith(docPrefix))
      .map((k) => k.slice(docPrefix.length))
      .filter((pageId) => !kept(pageId));
    if (pageIds.length <= max) return 0;

    // Copies saved before "seen" existed count as the oldest.
    const seen = await Promise.all(
      pageIds.map((pageId) =>
        kv
          .get(seenKey(personId, pageId))
          .then((v) => (typeof v === "number" ? v : 0)),
      ),
    );
    const droppable = pageIds
      .map((pageId, i) => ({ pageId, seen: seen[i] }))
      .sort((a, b) => b.seen - a.seen)
      .slice(max)
      .filter(({ pageId }) => !dirty.has(pageId) && !isDocOpen(pageId));

    await Promise.all(
      droppable.flatMap(({ pageId }) => [
        kv.del(docKey(personId, pageId)),
        kv.del(seenKey(personId, pageId)),
        kv.del(syncedKey(personId, pageId)),
      ]),
    );
    return droppable.length;
  } catch {
    return 0;
  }
}

/** How many of `pageIds` have a copy on this device (the "Available
 *  offline" progress in My settings). */
export async function countDocCopies(
  personId: string,
  pageIds: string[],
): Promise<number> {
  try {
    const prefix = `doc:${personId}:`;
    const saved = new Set(
      (await kv.keys())
        .filter((k) => k.startsWith(prefix))
        .map((k) => k.slice(prefix.length)),
    );
    return pageIds.filter((id) => saved.has(id)).length;
  } catch {
    return 0;
  }
}

/** Bytes the page copies take on disk (desktop app), or null where unknown
 *  (the web: the browser's own estimate covers it). */
export function offlineDocsSize(): Promise<number | null> {
  return kv.size().catch(() => null);
}
