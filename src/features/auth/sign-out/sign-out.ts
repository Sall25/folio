import type { QueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "src/api/supabase-client";
import { hasDirtyDocs, listDirtyPageIds } from "src/lib/offline-doc-cache";
import {
  markSignOutIntended,
  wipeAndReloadHome,
} from "src/lib/query-persistence";
import { queryKeys } from "src/hooks/use-session";
import { clearOutboxFor, countOutboxMessages } from "src/lib/chat-outbox";

// ONE way to sign out, used by every "Log out" button (user menu, workspace
// switcher) and by deleting your workspace.
//
//   1. A normal sign-out also revokes the session on the server. If that
//      fails — offline, or a network error — a local sign-out still ends
//      the session on this device (no network needed) instead of silently
//      leaving you signed in.
//   2. Then this device's offline data is wiped and the app reloads at "/",
//      the landing page — so the next person who signs in here starts fresh,
//      not on the previous person's page. Your unsent edits go too (the
//      Log out button already asked, see requestSignOut); other people's
//      unsent edits on this device stay. (The auth listener handles
//      sign-outs that come from elsewhere; it only ever runs once.)
export async function signOut(qc: QueryClient): Promise<void> {
  const personId = signedInPersonId(qc);
  markSignOutIntended();
  // Chat messages written offline go too (the Log out button already
  // asked, like for page edits).
  if (personId) await clearOutboxFor(personId);
  const { error } = await supabase.auth.signOut();
  if (error) {
    const { error: localError } = await supabase.auth.signOut({
      scope: "local",
    });
    if (localError) throw localError;
  }
  await wipeAndReloadHome(() => qc.clear(), {
    personId,
    keepOwnUnsent: false,
  });
}

function signedInPersonId(qc: QueryClient): string | null {
  return qc.getQueryData<Session | null>(queryKeys.session)?.user?.id ?? null;
}

/** Changes that would be lost by signing out now: your page edits not yet
 *  sent to the server, saves queued while offline, or chat messages
 *  written offline. */
export async function hasUnsyncedWork(qc: QueryClient): Promise<boolean> {
  const queued = qc
    .getMutationCache()
    .getAll()
    .some((m) => m.state.isPaused);
  if (queued) return true;
  const personId = signedInPersonId(qc);
  if (personId && (await countOutboxMessages(personId)) > 0) return true;
  return personId
    ? (await listDirtyPageIds(personId)).length > 0
    : await hasDirtyDocs();
}

// ── Confirmation when something hasn't synced ───────────────────────────
// A tiny store so any button can ask, and one dialog (SignOutHost, mounted
// once) answers — the button's own menu or popover may close meanwhile.

type Listener = (open: boolean) => void;
let listener: Listener | null = null;

export function subscribeSignOutConfirm(l: Listener): () => void {
  listener = l;
  return () => {
    if (listener === l) listener = null;
  };
}

/**
 * What "Log out" buttons call: signs out right away, or first asks when
 * there are changes that haven't reached the server yet (they'd be lost).
 */
export async function requestSignOut(qc: QueryClient): Promise<void> {
  if (listener && (await hasUnsyncedWork(qc))) {
    listener(true);
    return;
  }
  await signOut(qc);
}
