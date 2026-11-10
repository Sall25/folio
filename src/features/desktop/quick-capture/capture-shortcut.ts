import { useSyncExternalStore } from "react";
import { isDesktopApp } from "src/lib/desktop";
import { isMac } from "../platform";

// The quick capture shortcut (src-tauri/src/capture.rs): which one, chosen
// in My settings and kept on this computer, and whether the system let
// Folio have it (another app may already use it).

export const CAPTURE_SHORTCUTS = [
  "CommandOrControl+Shift+Space",
  "CommandOrControl+Alt+N",
  "Alt+Shift+N",
] as const;

const KEY = "folio-capture-shortcut";
const DEFAULT = CAPTURE_SHORTCUTS[0];

let error: string | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** The chosen shortcut, or "" for none. */
export function readCaptureShortcut(): string {
  try {
    return localStorage.getItem(KEY) ?? DEFAULT;
  } catch {
    return DEFAULT;
  }
}

/** Gives the shortcut to the app. Remembers why it failed, if it did. */
export async function applyCaptureShortcut(): Promise<void> {
  if (!isDesktopApp) return;
  const shortcut = readCaptureShortcut();
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("capture_set_shortcut", { shortcut: shortcut || null });
    error = null;
  } catch (e) {
    error = String(e);
  }
  notify();
}

export function setCaptureShortcut(shortcut: string) {
  try {
    localStorage.setItem(KEY, shortcut);
  } catch {
    /* storage blocked: lasts until restart */
  }
  notify();
  void applyCaptureShortcut();
}

/** "CommandOrControl+Shift+Space" → "Ctrl+Shift+Space" (⌘⇧Space on a Mac). */
export function shortcutLabel(shortcut: string): string {
  const parts = shortcut.split("+").map((p) => {
    if (p === "CommandOrControl") return isMac ? "⌘" : "Ctrl";
    if (p === "Alt") return isMac ? "⌥" : "Alt";
    if (p === "Shift") return isMac ? "⇧" : "Shift";
    return p;
  });
  return isMac ? parts.join("") : parts.join("+");
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let snapshot = { shortcut: readCaptureShortcut(), error };
function getSnapshot() {
  const shortcut = readCaptureShortcut();
  if (snapshot.shortcut !== shortcut || snapshot.error !== error) {
    snapshot = { shortcut, error };
  }
  return snapshot;
}

/** The chosen shortcut and why the system refused it (or null), live. */
export function useCaptureShortcut() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
