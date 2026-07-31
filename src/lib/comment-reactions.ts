import type { ID, Reactions } from "src/types";

export function parseReactions(raw: unknown): Reactions {
  if (!raw || typeof raw !== "object") return {};
  return raw as Reactions;
}

// Toggle a person's reaction with `emoji` on a comment. Returns the NEW
// reactions map. If the person already reacted with this emoji, they're removed
// (and the emoji key is pruned when empty); otherwise they're added.
export function toggleReaction(
  reactions: Reactions,
  emoji: string,
  personId: ID,
): Reactions {
  const next: Reactions = { ...reactions };
  const list = next[emoji] ? [...next[emoji]] : [];
  const idx = list.indexOf(personId);

  if (idx >= 0) {
    list.splice(idx, 1);
    if (list.length === 0) {
      delete next[emoji];
    } else {
      next[emoji] = list;
    }
  } else {
    next[emoji] = [...list, personId];
  }
  return next;
}

// Ordered entries for display: [emoji, personIds][], most-reacted first.
export function reactionEntries(reactions: Reactions): [string, ID[]][] {
  return Object.entries(reactions)
    .filter(([, ids]) => ids.length > 0)
    .sort((a, b) => b[1].length - a[1].length);
}
