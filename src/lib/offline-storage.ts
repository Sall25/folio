import { clearOfflineDocCache } from "src/lib/offline-doc-cache";

// How much this device keeps for Folio offline, and asking the browser to
// keep it.
//
// By default a site's storage is "best effort": the browser may delete all
// of it when the device runs low on space (and Safari after about a week
// without a visit, for sites not added to the home screen) — unsent page
// edits included. persist() asks for "persistent" storage instead, which the
// browser only deletes if the person does. Chrome decides on its own (it
// usually grants it to installed or frequently used sites), Firefox may ask
// the person once, Safari mostly grants it to home-screen apps. Refused or
// unsupported: nothing changes.

const PERSIST_ASKED_KEY = "folio-persist-asked";

/** Asks once per device for persistent storage. Resolves with whether
 *  Folio's storage is now persistent. */
export async function requestPersistentStorage(): Promise<boolean> {
  const storage = navigator.storage;
  if (!storage?.persist || !storage.persisted) return false;
  try {
    if (await storage.persisted()) return true;
    // Only once: Firefox shows a prompt each time persist() is called.
    if (localStorage.getItem(PERSIST_ASKED_KEY)) return false;
    localStorage.setItem(PERSIST_ASKED_KEY, "1");
    return await storage.persist();
  } catch {
    return false;
  }
}

/** Bytes this site uses on the device (IndexedDB, caches, service worker),
 *  or null where the browser doesn't say. */
export async function getOfflineStorageUsage(): Promise<number | null> {
  try {
    const estimate = await navigator.storage?.estimate?.();
    return typeof estimate?.usage === "number" ? estimate.usage : null;
  } catch {
    return null;
  }
}

/** Cached images and files from Supabase Storage (vite.config.ts →
 *  runtimeCaching). The app itself and its icons stay cached. */
const FILE_CACHES = ["folio-public-files"];

/** "Clear" in settings: drops page copies and cached images on this device.
 *  Pages with unsent edits are kept (anyone's), so nothing unsent is lost;
 *  the app itself stays installed, and pages are saved again when opened. */
export async function clearOfflineCopies(): Promise<void> {
  await clearOfflineDocCache(() => true);
  try {
    if (typeof caches !== "undefined") {
      await Promise.all(FILE_CACHES.map((name) => caches.delete(name)));
    }
  } catch {
    /* Cache Storage unavailable */
  }
}

/** 34 MB, 512 KB… in the reader's language. */
export function formatBytes(bytes: number, locale?: string): string {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: units[unit],
    unitDisplay: "short",
    maximumFractionDigits: value < 10 && unit > 0 ? 1 : 0,
  }).format(value);
}
