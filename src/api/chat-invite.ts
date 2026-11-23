// What an invite to a room actually did.
//
// The server adds only the people the room's scope allows — a teamspace
// room takes that teamspace's members, a workspace room takes the
// workspace's — and used to skip the rest silently, answering with a row
// count the app threw away (migration 060). Kept apart from chat.ts so it
// can be read, and tested, without a Supabase client.

export interface InviteResult {
  /** Added just now. */
  added: string[];
  /** Allowed, but already in the room. */
  already: string[];
  /** Picked, and outside the room's scope: the ones to explain. */
  skipped: string[];
}

/** Read defensively: an older server still answers with a plain count, and
 *  a count says nothing about who — so it reads as "nothing to report"
 *  rather than inventing names. */
export function toInviteResult(data: unknown): InviteResult {
  const out = (data ?? {}) as Partial<Record<keyof InviteResult, unknown>>;
  const list = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  return {
    added: list(out.added),
    already: list(out.already),
    skipped: list(out.skipped),
  };
}
