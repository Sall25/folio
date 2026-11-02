// What a folio:// link asks for. Kept apart from deep-links.ts (no Tauri,
// no Supabase) so the tests can read it.
//
//   folio://auth/callback?code=…   the end of a sign-in in the browser
//                                  (Google, an email link): the app swaps
//                                  the code for a session
//   folio://<path>                 the web app's <path>, opened in the app:
//                                  folio://page/abc is /page/abc,
//                                  folio://t/ts1/chat/r1 is /t/ts1/chat/r1

/** Where Supabase sends the browser back to at the end of a sign-in started
 *  in the desktop app (allowed in Supabase: Authentication → URL
 *  Configuration → Redirect URLs). */
export const DESKTOP_AUTH_CALLBACK = "folio://auth/callback";

export type DeepLink =
  | { kind: "auth"; code: string | null; error: string | null }
  | { kind: "path"; path: string; search: Record<string, string> };

export function parseDeepLink(url: string): DeepLink | null {
  // Parsed by hand: browsers disagree on the host and path of a URL with an
  // unknown scheme.
  const match = /^folio:\/*([^?#]*)(\?[^#]*)?(#.*)?$/i.exec(url.trim());
  if (!match) return null;
  const path = `/${match[1].replace(/\/+$/, "")}`;
  const search = new URLSearchParams(match[2] ?? "");
  // Supabase puts an error in the query or after the #.
  const hash = new URLSearchParams((match[3] ?? "").replace(/^#/, ""));

  if (path === "/auth/callback") {
    const error =
      search.get("error_description") ??
      hash.get("error_description") ??
      search.get("error") ??
      hash.get("error");
    return { kind: "auth", code: search.get("code"), error };
  }

  // Only plain app paths: no "..", no scheme or host smuggled in.
  if (path.split("/").some((part) => part === "..") || path.includes("//")) {
    return null;
  }
  return { kind: "path", path, search: Object.fromEntries(search) };
}
