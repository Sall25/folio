import { useCallback, useRef, useSyncExternalStore } from "react";
import {
  jsonCodec,
  removeStorage,
  subscribeStorage,
  writeStorage,
  type StorageCodec,
} from "src/lib/local-storage";

const isBrowser = typeof window !== "undefined";

export type UseLocalStorageOptions<T> = Partial<StorageCodec<T>>;

export type SetLocalStorage<T> = (next: T | ((prev: T) => T)) => void;

/**
 * Persisted state backed by localStorage. Reads synchronously on first render,
 * writes on update, and stays in sync across components (same tab) and other
 * tabs. The default value is NOT written to storage — only explicit sets are —
 * so "no value yet" stays distinguishable (useful for OS-preference fallbacks).
 *
 * @returns [value, setValue, remove]
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options?: UseLocalStorageOptions<T>,
): readonly [T, SetLocalStorage<T>, () => void] {
  const serialize = options?.serialize ?? jsonCodec<T>().serialize;
  const deserialize = options?.deserialize ?? jsonCodec<T>().deserialize;

  // useSyncExternalStore requires getSnapshot to return a STABLE reference when
  // nothing changed. localStorage hands back a string we'd re-parse every call
  // (new object each time -> infinite loop), so cache by the raw string and only
  // re-parse when it actually changes.
  const cache = useRef<{ raw: string | null; value: T } | null>(null);

  const getSnapshot = useCallback((): T => {
    let raw: string | null = null;
    try {
      raw = isBrowser ? window.localStorage.getItem(key) : null;
    } catch {
      raw = null;
    }

    if (cache.current && cache.current.raw === raw) {
      return cache.current.value;
    }

    let value: T;
    if (raw === null) {
      value = defaultValue;
    } else {
      try {
        value = deserialize(raw);
      } catch {
        value = defaultValue;
      }
    }
    cache.current = { raw, value };
    return value;
  }, [key, defaultValue, deserialize]);

  const subscribe = useCallback(
    (cb: () => void) => subscribeStorage(key, cb),
    [key],
  );

  const value = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => defaultValue, // server snapshot
  );

  const setValue = useCallback<SetLocalStorage<T>>(
    (next) => {
      const prev = getSnapshot();
      const resolved =
        typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      writeStorage(key, resolved, { serialize, deserialize });
    },
    [key, getSnapshot, serialize, deserialize],
  );

  const remove = useCallback(() => removeStorage(key), [key]);

  return [value, setValue, remove] as const;
}
