import { isDesktopApp } from "src/lib/desktop";

// A small key/value store for what Folio keeps on this device for offline
// use: page copies (offline-doc-cache.ts) and the saved app data
// (query-persistence.ts).
//
//   • On the web: an IndexedDB store, as before. The browser may clear it
//     when the device runs low on space, and caps how much a site keeps.
//   • In the desktop app: files in the app's own data folder
//     (…/AppData/Local/app.folio.desktop/<name>/ on Windows), one file per
//     key. Nothing clears them but Folio or the person, and there's no
//     quota. The first time, whatever the IndexedDB store held (unsent edits
//     included) is moved over.
//
// Values are Uint8Array (a page's Yjs state), strings, numbers or booleans.
// Every method may throw; callers already treat storage as best effort.

export type KvValue = Uint8Array | string | number | boolean;

export interface OfflineKv {
  get(key: string): Promise<KvValue | undefined>;
  put(key: string, value: KvValue): Promise<void>;
  del(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
  /** Bytes used, or null where unknown. */
  size(): Promise<number | null>;
}

// ── IndexedDB (the web) ──────────────────────────────────────────────────

export function idbKv(dbName: string, storeName: string): OfflineKv {
  let dbPromise: Promise<IDBDatabase> | null = null;

  const openDb = () => {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(storeName)) {
          req.result.createObjectStore(storeName);
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
  };

  const run = <T>(
    mode: IDBTransactionMode,
    op: (store: IDBObjectStore) => IDBRequest<T>,
  ) =>
    openDb().then(
      (db) =>
        new Promise<T>((resolve, reject) => {
          const req = op(
            db.transaction(storeName, mode).objectStore(storeName),
          );
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        }),
    );

  return {
    get: (key) => run<unknown>("readonly", (s) => s.get(key)).then(asValue),
    put: (key, value) =>
      run("readwrite", (s) => s.put(value, key)).then(() => {}),
    del: (key) => run("readwrite", (s) => s.delete(key)).then(() => {}),
    keys: () =>
      run<IDBValidKey[]>("readonly", (s) => s.getAllKeys()).then((keys) =>
        keys.filter((k): k is string => typeof k === "string"),
      ),
    clear: () => run("readwrite", (s) => s.clear()).then(() => {}),
    size: async () => null,
  };
}

const asValue = (v: unknown): KvValue | undefined =>
  v instanceof Uint8Array ||
  typeof v === "string" ||
  typeof v === "number" ||
  typeof v === "boolean"
    ? v
    : undefined;

// ── Files (the desktop app) ──────────────────────────────────────────────
// Encoding, exported for the tests (offline-kv.test.ts):
//   • a key becomes a file name that's safe on every system (base64url of
//     its UTF-8 bytes — keys hold ":" which Windows refuses), plus ".v";
//   • a value becomes one tag byte then its bytes: 0 raw bytes, 1 JSON
//     (strings, numbers, booleans).

const FILE_EXT = ".v";

export function keyToFileName(key: string): string {
  const bytes = new TextEncoder().encode(key);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return (
    btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") +
    FILE_EXT
  );
}

export function fileNameToKey(name: string): string | null {
  if (!name.endsWith(FILE_EXT)) return null;
  try {
    const b64 = name
      .slice(0, -FILE_EXT.length)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    return new TextDecoder().decode(
      Uint8Array.from(bin, (c) => c.charCodeAt(0)),
    );
  } catch {
    return null;
  }
}

export function encodeValue(value: KvValue): Uint8Array {
  if (value instanceof Uint8Array) {
    const out = new Uint8Array(value.length + 1);
    out[0] = 0;
    out.set(value, 1);
    return out;
  }
  const json = new TextEncoder().encode(JSON.stringify(value));
  const out = new Uint8Array(json.length + 1);
  out[0] = 1;
  out.set(json, 1);
  return out;
}

export function decodeValue(bytes: Uint8Array): KvValue | undefined {
  if (bytes.length === 0) return undefined;
  if (bytes[0] === 0) return bytes.slice(1);
  if (bytes[0] === 1) {
    try {
      return asValue(JSON.parse(new TextDecoder().decode(bytes.subarray(1))));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function fileKv(dir: string, migrateFrom?: OfflineKv): OfflineKv {
  const fs = () => import("@tauri-apps/plugin-fs");
  let ready: Promise<void> | null = null;

  // The folder exists, and the IndexedDB store's contents were moved over
  // once (a marker file records it).
  const ensure = () => {
    if (ready) return ready;
    ready = (async () => {
      const { mkdir, exists, writeFile, BaseDirectory } = await fs();
      const baseDir = BaseDirectory.AppLocalData;
      if (!(await exists(dir, { baseDir }))) {
        await mkdir(dir, { baseDir, recursive: true });
      }
      const marker = `${dir}/.moved-from-browser`;
      if (migrateFrom && !(await exists(marker, { baseDir }))) {
        try {
          for (const key of await migrateFrom.keys()) {
            const value = await migrateFrom.get(key);
            if (value !== undefined) {
              await writeFile(
                `${dir}/${keyToFileName(key)}`,
                encodeValue(value),
                { baseDir },
              );
            }
          }
          await migrateFrom.clear();
        } catch (e) {
          console.warn("[offline] moving the browser copies failed", e);
        }
        await writeFile(marker, new Uint8Array(), { baseDir });
      }
    })();
    ready.catch(() => {
      ready = null;
    });
    return ready;
  };

  const path = (key: string) => `${dir}/${keyToFileName(key)}`;

  return {
    async get(key) {
      await ensure();
      const { readFile, exists, BaseDirectory } = await fs();
      const baseDir = BaseDirectory.AppLocalData;
      if (!(await exists(path(key), { baseDir }))) return undefined;
      return decodeValue(await readFile(path(key), { baseDir }));
    },
    async put(key, value) {
      await ensure();
      const { writeFile, BaseDirectory } = await fs();
      await writeFile(path(key), encodeValue(value), {
        baseDir: BaseDirectory.AppLocalData,
      });
    },
    async del(key) {
      await ensure();
      const { remove, exists, BaseDirectory } = await fs();
      const baseDir = BaseDirectory.AppLocalData;
      if (await exists(path(key), { baseDir }))
        await remove(path(key), { baseDir });
    },
    async keys() {
      await ensure();
      const { readDir, BaseDirectory } = await fs();
      const entries = await readDir(dir, {
        baseDir: BaseDirectory.AppLocalData,
      });
      return entries
        .filter((e) => e.isFile)
        .map((e) => fileNameToKey(e.name))
        .filter((k): k is string => k !== null);
    },
    async clear() {
      await ensure();
      const { readDir, remove, BaseDirectory } = await fs();
      const baseDir = BaseDirectory.AppLocalData;
      for (const e of await readDir(dir, { baseDir })) {
        if (e.isFile && e.name.endsWith(FILE_EXT))
          await remove(`${dir}/${e.name}`, { baseDir });
      }
    },
    async size() {
      await ensure();
      const { readDir, stat, BaseDirectory } = await fs();
      const baseDir = BaseDirectory.AppLocalData;
      let total = 0;
      for (const e of await readDir(dir, { baseDir })) {
        if (!e.isFile) continue;
        total += (await stat(`${dir}/${e.name}`, { baseDir })).size;
      }
      return total;
    },
  };
}

/** The store for `name`: files in the desktop app (moving the browser's
 *  copy over once), the IndexedDB store on the web. */
export function offlineKv(
  name: string,
  idbName: string,
  idbStore: string,
): OfflineKv {
  const idb = idbKv(idbName, idbStore);
  return isDesktopApp ? fileKv(name, idb) : idb;
}
