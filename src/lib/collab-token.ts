import { supabase } from "src/api/supabase-client";

// The token a page connection (Hocuspocus) signs in with, read again on
// every connect and reconnect instead of once when the page opens.
//
// The session's access token lasts an hour. A connection that kept the one
// it started with sent an expired token after a long offline spell (or an
// hour on one page), the server refused it ("Not authenticated"), and the
// page never connected again: "Can't reach this page right now", and its
// edits stuck at "changes waiting to sync". getSession() refreshes an
// expired token first when it can.

const TIMEOUT_MS = 4000;

/** A current access token; `fallback` when it can't be read (offline, or
 *  the network still failing). */
export async function collabToken(fallback: string): Promise<string> {
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>((resolve) =>
        window.setTimeout(() => resolve(null), TIMEOUT_MS),
      ),
    ]);
    return result?.data.session?.access_token ?? fallback;
  } catch {
    return fallback;
  }
}
