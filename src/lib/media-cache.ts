import { useState, useSyncExternalStore } from "react";
import * as Y from "yjs";
import { isDesktopApp } from "src/lib/desktop";
import { localCopy } from "src/api/uploads";

// Desktop app: images, videos, audio and files from pages, saved on this
// computer so they show and play without a connection. The files are
// downloaded and kept by the app (src-tauri/src/media.rs); this module keeps
// the list of what's saved and turns a saved file into an address the page
// can show (Tauri's asset protocol, which also lets a video be skipped
// through).
//
// Saved two ways:
//   • by hand — "Save to this computer" on a media block (MediaSaveButton)
//   • automatically — per the two settings in My settings: images (on by
//     default) and videos, audio and files (off by default). Only files
//     uploaded to Folio are saved automatically: they're found when a page
//     is shown and when a page is downloaded for offline use
//     (download-offline-pages.ts → saveMediaInDoc).
// Links to YouTube, Vimeo, Loom or Drive are never saved: those files
// aren't Folio's to download.
//
// Does nothing on the web.

interface SavedFile {
  /** The address the page shows it from. */
  src: string;
  size: number;
}

interface MediaEntry {
  url: string;
  path: string;
  size: number;
}

const saved = new Map<string, SavedFile>();
/** Downloads running: url → share received (0–1), or null when the size
 *  isn't known. */
const progress = new Map<string, number | null>();
const inFlight = new Map<string, Promise<boolean>>();
/** Automatic saves that failed this session: not tried again until the
 *  app restarts (a file deleted from the server, a dead link). */
const autoFailed = new Set<string>();

let version = 0;
const listeners = new Set<() => void>();
const changed = () => {
  version++;
  listeners.forEach((l) => l());
};

let corePromise: Promise<typeof import("@tauri-apps/api/core")> | null = null;
/** Tauri's API, loaded once (only in the desktop app). */
const core = () => (corePromise ??= import("@tauri-apps/api/core"));

let loading: Promise<void> | null = null;

/** Reads what's already saved, once, and starts listening for progress. */
function ensureLoaded(): Promise<void> {
  if (!isDesktopApp) return Promise.resolve();
  if (loading) return loading;
  loading = (async () => {
    const { invoke, convertFileSrc } = await core();
    const entries = await invoke<MediaEntry[]>("media_list");
    for (const e of entries) {
      saved.set(e.url, { src: convertFileSrc(e.path), size: e.size });
    }
    const { listen } = await import("@tauri-apps/api/event");
    await listen<{ url: string; received: number; total: number | null }>(
      "media-progress",
      ({ payload }) => {
        if (!progress.has(payload.url)) return;
        progress.set(
          payload.url,
          payload.total ? payload.received / payload.total : null,
        );
        changed();
      },
    );
    changed();
  })();
  loading.catch((error) => {
    console.warn("[media] reading saved media failed", error);
    loading = null;
  });
  return loading;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void ensureLoaded();
  return () => {
    listeners.delete(listener);
  };
}

const getVersion = () => version;

/** Re-renders when anything saved or downloading changes. */
function useMediaVersion() {
  return useSyncExternalStore(subscribe, getVersion, () => 0);
}

const EMBED_HOSTS =
  /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|loom\.com|drive\.google\.com|docs\.google\.com)$/i;

/** Whether this address can be saved on this computer: the desktop app, a
 *  web address, and not a video site's page. */
export function canSaveMedia(url: string | null | undefined): url is string {
  if (!isDesktopApp || !url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return !EMBED_HOSTS.test(u.hostname);
  } catch {
    return false;
  }
}

/** A file uploaded to Folio (Supabase Storage). */
function isFolioUpload(url: string): boolean {
  return url.includes("/storage/v1/object/public/");
}

/** Downloads `url` to this computer. Resolves with whether it's saved. */
export function saveMedia(url: string): Promise<boolean> {
  if (!canSaveMedia(url)) return Promise.resolve(false);
  if (saved.has(url)) return Promise.resolve(true);
  const running = inFlight.get(url);
  if (running) return running;

  const job = (async () => {
    progress.set(url, 0);
    changed();
    try {
      await ensureLoaded();
      if (saved.has(url)) return true;
      const { invoke, convertFileSrc } = await core();
      const entry = await invoke<MediaEntry>("media_save", { url });
      saved.set(url, { src: convertFileSrc(entry.path), size: entry.size });
      return true;
    } catch (error) {
      console.warn("[media] saving failed", url, error);
      return false;
    } finally {
      progress.delete(url);
      inFlight.delete(url);
      changed();
    }
  })();
  inFlight.set(url, job);
  return job;
}

/** Removes the copy on this computer. */
export async function removeMedia(url: string): Promise<void> {
  if (!isDesktopApp) return;
  const { invoke } = await core();
  await invoke("media_remove", { url });
  saved.delete(url);
  changed();
}

/** Removes every saved file. */
export async function clearMedia(): Promise<void> {
  if (!isDesktopApp) return;
  const { invoke } = await core();
  await invoke("media_clear");
  saved.clear();
  autoFailed.clear();
  changed();
}

/** Opens the saved copy of `url` in the computer's app for that kind of
 *  file. */
export async function openSavedMedia(url: string): Promise<void> {
  if (!isDesktopApp) return;
  const { invoke } = await core();
  await invoke("media_open", { url });
}

/** Opens the folder the files are saved in. */
export async function openMediaFolder(): Promise<void> {
  if (!isDesktopApp) return;
  const { invoke } = await core();
  await invoke("media_open_folder");
}

// ── What to show ────────────────────────────────────────────────────────────

/** The address to show `url` from: the file just uploaded here, the copy
 *  saved on this computer, or the address itself. */
export function useMediaSrc<T extends string | null | undefined>(
  url: T,
): T | string {
  useMediaVersion();
  if (!url) return url;
  return localCopy(url) ?? saved.get(url)?.src ?? url;
}

/** useMediaSrc for a video or audio player: once it has started playing, it
 *  keeps the address it plays from, so saving the file mid-way doesn't
 *  reload the player and lose the position. */
export function usePlaybackSrc(url: string, started: boolean): string {
  const live = useMediaSrc(url);
  const [held, setHeld] = useState({ url, src: live });
  // Derived during render (React's pattern for resets): follow the live
  // address until playback starts, and always for another file.
  if (held.url !== url || (!started && held.src !== live)) {
    setHeld({ url, src: live });
  }
  return held.url === url && started ? held.src : live;
}

export type MediaSaveState =
  | { kind: "unsaved" }
  | { kind: "saving"; progress: number | null }
  | { kind: "saved"; size: number };

/** Whether `url` is saved on this computer, being saved, or neither. */
export function useMediaSaveState(
  url: string | null | undefined,
): MediaSaveState {
  useMediaVersion();
  if (url && progress.has(url)) {
    return { kind: "saving", progress: progress.get(url) ?? null };
  }
  const file = url ? saved.get(url) : undefined;
  return file ? { kind: "saved", size: file.size } : { kind: "unsaved" };
}

/** Bytes of media saved on this computer, live. */
export function useMediaBytes(): number {
  useMediaVersion();
  let total = 0;
  saved.forEach((f) => (total += f.size));
  return total;
}

// ── Saving automatically ────────────────────────────────────────────────────

export type MediaKind = "image" | "other";

export interface MediaAutoPrefs {
  images: boolean;
  other: boolean;
}

const PREFS_KEY = "folio-media-auto";
const DEFAULT_PREFS: MediaAutoPrefs = { images: true, other: false };
let prefsCache: { raw: string | null; value: MediaAutoPrefs } | null = null;

function readPrefs(): MediaAutoPrefs {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PREFS_KEY);
  } catch {
    /* storage blocked */
  }
  if (prefsCache && prefsCache.raw === raw) return prefsCache.value;
  let value = DEFAULT_PREFS;
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<MediaAutoPrefs>) : null;
    if (parsed) {
      value = {
        images: parsed.images ?? DEFAULT_PREFS.images,
        other: parsed.other ?? DEFAULT_PREFS.other,
      };
    }
  } catch {
    /* unreadable: the defaults */
  }
  prefsCache = { raw, value };
  return value;
}

export function setMediaAuto(kind: MediaKind, on: boolean) {
  const prefs = readPrefs();
  const next =
    kind === "image" ? { ...prefs, images: on } : { ...prefs, other: on };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: lasts until reload */
  }
  changed();
}

export function useMediaAutoPrefs(): MediaAutoPrefs {
  useMediaVersion();
  return readPrefs();
}

// Automatic saves wait in a queue, two at a time, so a page full of images
// (or a whole workspace being downloaded) doesn't open dozens of downloads.
const MAX_AUTO = 2;
const queue: string[] = [];
let activeAuto = 0;

function pump() {
  while (activeAuto < MAX_AUTO && queue.length > 0) {
    const url = queue.shift()!;
    if (saved.has(url) || inFlight.has(url)) continue;
    activeAuto++;
    void saveMedia(url)
      .then((ok) => {
        if (!ok) autoFailed.add(url);
      })
      .finally(() => {
        activeAuto--;
        pump();
      });
  }
}

/** Saves `url` in the background if the settings say this kind is saved
 *  automatically. Only files uploaded to Folio. */
export function autoSaveMedia(url: string | null | undefined, kind: MediaKind) {
  if (!canSaveMedia(url) || !isFolioUpload(url) || !navigator.onLine) return;
  const prefs = readPrefs();
  if (kind === "image" ? !prefs.images : !prefs.other) return;
  if (autoFailed.has(url) || queue.includes(url)) return;
  void ensureLoaded().then(() => {
    if (saved.has(url) || inFlight.has(url) || queue.includes(url)) return;
    queue.push(url);
    pump();
  });
}

/** Every media file in a page's document, for a page downloaded for offline
 *  use: image, video and audio blocks, and each file of a file block. */
export function saveMediaInDoc(ydoc: Y.Doc) {
  if (!isDesktopApp) return;
  const visit = (el: Y.XmlElement | Y.XmlFragment) => {
    for (const child of el.toArray()) {
      if (!(child instanceof Y.XmlElement)) continue;
      const node = child;
      const name = node.nodeName;
      if (name === "image") {
        autoSaveMedia(node.getAttribute("src") as string | undefined, "image");
      } else if (name === "video" || name === "audio") {
        autoSaveMedia(node.getAttribute("src") as string | undefined, "other");
      } else if (name === "file") {
        const files = node.getAttribute("files") as unknown;
        if (Array.isArray(files)) {
          for (const f of files) {
            const url = (f as { url?: unknown })?.url;
            if (typeof url === "string") autoSaveMedia(url, "other");
          }
        }
      }
      visit(node);
    }
  };
  try {
    visit(ydoc.getXmlFragment("default"));
  } catch (error) {
    console.warn("[media] reading a page's media failed", error);
  }
}
