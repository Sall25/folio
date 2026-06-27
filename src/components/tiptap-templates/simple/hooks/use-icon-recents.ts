import { useCallback } from "react";
import { useLocalStorage } from "./use-local-storage";
import type { Target } from "src/components/tiptap-ui/cover/types";

export type RecentIcon = { name: string; color?: string };

export interface IconRecents {
  /** last tab used (a UI preference, not node data) */
  target: Target;
  emoji: string[]; // recent emoji glyphs, newest first
  icon: RecentIcon[]; // recent lucide picks, newest first
  upload?: string[]; // recent upload urls, newest first
}

const MAX = 10;
const UPLOAD_MAX = 5; // urls/data can be heavy — keep this smaller

const DEFAULT_RECENTS: IconRecents = { target: "Emoji", emoji: [], icon: [] };

const KEY = "folio:icon-picker:recents";

// MRU push: pull an existing match to the front, prepend, cap.
function pushString(list: string[], value: string, max = MAX) {
  return [value, ...list.filter((v) => v !== value)].slice(0, max);
}
function pushIcon(list: RecentIcon[], pick: RecentIcon) {
  // identity is the NAME — re-picking "Bell" in a new color updates, not dupes
  return [pick, ...list.filter((i) => i.name !== pick.name)].slice(0, MAX);
}

/**
 * Remembers the last 10 emoji and 10 icon picks (plus a few uploads) across
 * every icon picker in the app. Shared by the callout and the cover via one key.
 */
export function useIconRecents() {
  const [recents, setRecents] = useLocalStorage<IconRecents>(
    KEY,
    DEFAULT_RECENTS,
  );

  const setTab = useCallback(
    (target: Target) => setRecents((r) => ({ ...r, target })),
    [setRecents],
  );

  const recordEmoji = useCallback(
    (glyph: string) =>
      setRecents((r) => ({
        ...r,
        emoji: pushString(r.emoji, glyph),
        target: "Emoji",
      })),
    [setRecents],
  );

  const recordIcon = useCallback(
    (pick: RecentIcon) =>
      setRecents((r) => ({
        ...r,
        icon: pushIcon(r.icon, pick),
        target: "Icons",
      })),
    [setRecents],
  );

  const recordUpload = useCallback(
    (url: string) =>
      setRecents((r) => ({
        ...r,
        upload: pushString(r.upload ?? [], url, UPLOAD_MAX),
        target: "Upload",
      })),
    [setRecents],
  );

  return { recents, setTab, recordEmoji, recordIcon, recordUpload };
}
