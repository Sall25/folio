import { isDesktopApp } from "src/lib/desktop";
import { isPageWindow } from "../page-window/page-window";
import { parseDeepLink } from "./parse-deep-link";

// folio:// links in the desktop app (parse-deep-link.ts says what each one
// means). The system hands them to the running app (tauri-plugin-deep-link;
// on Windows and Linux tauri-plugin-single-instance passes them on from the
// second launch the click starts), or starts the app with one. Only the
// main window handles them; page windows leave them alone.

type Navigate = (path: string, search: Record<string, string>) => void;

let navigate: Navigate | null = null;
// A page link that came before the app could open it (signing in, still
// loading): opened as soon as it can.
let pending: { path: string; search: Record<string, string> } | null = null;

/** DesktopDeepLinkNavigator (inside the router) opens page links with this.
 *  Returns the function that stops it. */
export function setDeepLinkNavigator(fn: Navigate): () => void {
  navigate = fn;
  if (pending) {
    const { path, search } = pending;
    pending = null;
    fn(path, search);
  }
  return () => {
    if (navigate === fn) navigate = null;
  };
}

const authErrorListeners = new Set<(message: string) => void>();

/** The sign-in screen shows why a sign-in in the browser failed. */
export function onDesktopAuthError(
  listener: (message: string) => void,
): () => void {
  authErrorListeners.add(listener);
  return () => {
    authErrorListeners.delete(listener);
  };
}

const authError = (message: string) =>
  authErrorListeners.forEach((l) => l(message));

async function bringToFront() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    await win.unminimize();
    await win.setFocus();
  } catch {
    /* the link still works */
  }
}

async function handle(url: string) {
  const link = parseDeepLink(url);
  if (!link) return;
  void bringToFront();

  if (link.kind === "auth") {
    if (link.error) {
      authError(link.error);
      return;
    }
    if (!link.code) return;
    // The session lands through Supabase's auth listener; AuthGate swaps to
    // the app as after any sign-in.
    const { supabase } = await import("src/api/supabase-client");
    const { error } = await supabase.auth.exchangeCodeForSession(link.code);
    if (error) authError(error.message);
    return;
  }

  if (navigate) navigate(link.path, link.search);
  else pending = { path: link.path, search: link.search };
}

let installed = false;

/** Call once at start (main.tsx). Does nothing on the web or in a page
 *  window. */
export async function installDesktopDeepLinks(): Promise<void> {
  if (!isDesktopApp || isPageWindow || installed) return;
  installed = true;
  try {
    const { getCurrent, onOpenUrl } =
      await import("@tauri-apps/plugin-deep-link");
    await onOpenUrl((urls) => urls.forEach((u) => void handle(u)));
    // The link the app was started with, if any.
    const start = await getCurrent();
    start?.forEach((u) => void handle(u));
  } catch (e) {
    console.warn("[desktop] folio:// links unavailable", e);
  }
}
