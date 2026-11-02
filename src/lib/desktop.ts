// Folio's desktop app (Tauri, src-tauri/) runs this same web app in a
// native window. This module holds what differs there.

/** Running inside the desktop app. */
export const isDesktopApp =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** A link that leaves Folio: another site, or a mail link. */
function isExternal(href: string): boolean {
  try {
    const url = new URL(href, window.location.href);
    if (url.protocol === "mailto:") return true;
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.origin !== window.location.origin
    );
  } catch {
    return false;
  }
}

function openInBrowser(url: string) {
  import("@tauri-apps/plugin-opener")
    .then(({ openUrl }) => openUrl(url))
    .catch((error) => console.error("Couldn't open the link:", url, error));
}

/** In the desktop app, links to other sites open in the default browser
 *  (or mail app), not inside Folio's window, where they'd replace the app
 *  or do nothing. Covers plain links (left and middle click) and
 *  window.open (the editor's links, "Open" buttons). Call once at start;
 *  does nothing on the web. */
export function installDesktopLinks() {
  if (!isDesktopApp) return;

  const onClick = (event: MouseEvent) => {
    // After the app's own handlers: one that handled the click (and
    // prevented the default) wins.
    if (event.defaultPrevented) return;
    if (event.button !== 0 && event.button !== 1) return;
    const anchor = (event.target as Element | null)?.closest?.("a[href]");
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (!isExternal(anchor.href)) return;
    event.preventDefault();
    openInBrowser(anchor.href);
  };
  document.addEventListener("click", onClick);
  document.addEventListener("auxclick", onClick);

  const nativeOpen = window.open.bind(window);
  window.open = (url?: string | URL, target?: string, features?: string) => {
    if (url != null && isExternal(String(url))) {
      openInBrowser(new URL(String(url), window.location.href).href);
      return null;
    }
    return nativeOpen(url, target, features);
  };
}
