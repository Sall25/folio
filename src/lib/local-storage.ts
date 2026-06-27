const isBrowser = typeof window !== "undefined";

export interface StorageCodec<T> {
  serialize: (value: T) => string;
  deserialize: (raw: string) => T;
}

/** Default codec — JSON. Handles objects, arrays, numbers, booleans, null. */
export function jsonCodec<T>(): StorageCodec<T> {
  return {
    serialize: (v) => JSON.stringify(v),
    deserialize: (raw) => JSON.parse(raw) as T,
  };
}

/** Plain-string codec — use when other readers expect the raw value (e.g. a
 *  no-flash inline script reading "dark"/"light" without JSON quotes). */
export const stringCodec: StorageCodec<string> = {
  serialize: (v) => v,
  deserialize: (raw) => raw,
};

export function readStorage<T>(
  key: string,
  fallback: T,
  codec: StorageCodec<T> = jsonCodec<T>(),
): T {
  if (!isBrowser) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return codec.deserialize(raw);
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(
  key: string,
  value: T,
  codec: StorageCodec<T> = jsonCodec<T>(),
): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, codec.serialize(value));
    emitChange(key);
  } catch {
    // quota exceeded / storage unavailable — ignore
  }
}

export function removeStorage(key: string): void {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(key);
    emitChange(key);
  } catch {
    // ignore
  }
}

// ── change notification ───────────────────────────────────────────────────────
// The native `storage` event fires in OTHER tabs only, so we add a same-tab
// custom event to keep components/stores on the same key in sync locally.
const LOCAL_EVENT = "folio:local-storage";

function emitChange(key: string) {
  if (!isBrowser) return;
  window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: { key } }));
}

/** Subscribe to changes for a key (this tab and others). Returns an unsubscribe. */
export function subscribeStorage(key: string, cb: () => void): () => void {
  if (!isBrowser) return () => {};
  const onLocal = (e: Event) => {
    if ((e as CustomEvent).detail?.key === key) cb();
  };
  const onCross = (e: StorageEvent) => {
    // key === null means storage was cleared
    if (e.key === key || e.key === null) cb();
  };
  window.addEventListener(LOCAL_EVENT, onLocal);
  window.addEventListener("storage", onCross);
  return () => {
    window.removeEventListener(LOCAL_EVENT, onLocal);
    window.removeEventListener("storage", onCross);
  };
}
