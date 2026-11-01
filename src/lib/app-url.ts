// Links meant for other people (share, publish, invite, copy link) point at
// the public web app: VITE_PUBLIC_APP_URL (e.g. https://folio.app). In the
// desktop app the window's own address (tauri://localhost) opens for no
// one, and on a Vercel preview it's the preview's domain. Without the
// variable (local dev), the current site.

const PUBLIC_APP_URL = (
  import.meta.env.VITE_PUBLIC_APP_URL as string | undefined
)?.replace(/\/+$/, "");

/** The public web address of `path` (starting with "/"). */
export function appUrl(path: string): string {
  const base = PUBLIC_APP_URL || window.location.origin;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
