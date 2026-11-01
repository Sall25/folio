import { useEffect } from "react";
import { location } from "src/app/routes";
import { isMac } from "../platform";
import { setTabNavigator, tabs } from "./tabs-store";

// Keeps the desktop tabs and the router in step, and adds the browser-like
// ways to work with tabs:
//   - every move of the router (a link, the sidebar, a redirect) is
//     recorded in the active tab; switching tabs moves the router;
//   - Ctrl (Cmd) + click or middle click on a link or a page in the sidebar
//     opens it in a new tab instead;
//   - Ctrl+T, Ctrl+W, Ctrl+Shift+T, Ctrl+Tab, Ctrl+1…9, Alt+← / Alt+→ and
//     the mouse's back / forward buttons.
// Mounted once, inside the router, only in the desktop app.

const addressOf = (l: { pathname: string; search: string; hash: string }) =>
  `${l.pathname}${l.search}${l.hash}`;

/** How long after a Ctrl+click or middle click a navigation still counts as
 *  coming from it (the app navigates in its own click handlers). */
const NEW_TAB_WINDOW_MS = 400;

export function DesktopTabsSync() {
  useEffect(() => {
    const history = location.history;
    let moving = false;

    // Tab switches, back and forward: move the router without recording.
    setTabNavigator((path) => {
      if (addressOf(history.location) === path) return;
      moving = true;
      history.replace(path);
      moving = false;
    });

    tabs.init(addressOf(history.location));

    const unlisten = history.listen(({ action, location: loc }) => {
      if (moving) return;
      tabs.record(addressOf(loc), action === "PUSH");
    });

    // ── Open in a new tab ────────────────────────────────────────────────
    let newTabUntil = 0;
    const mod = (e: MouseEvent | KeyboardEvent) =>
      isMac ? e.metaKey : e.ctrlKey;

    const onPointerDown = (e: MouseEvent) => {
      newTabUntil =
        (e.button === 0 && mod(e)) || e.button === 1
          ? Date.now() + NEW_TAB_WINDOW_MS
          : 0;
    };

    // Links inside the app: their default would open another window.
    const onLinkClick = (e: MouseEvent) => {
      if (!((e.button === 0 && mod(e)) || e.button === 1)) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return; // desktop.ts handles it
      e.preventDefault();
      e.stopPropagation();
      newTabUntil = 0;
      tabs.open(addressOf(url), { background: true });
    };

    // The app's own navigations (sidebar rows, mentions, search results
    // call navigate() in their click handlers): right after a Ctrl+click or
    // middle click, the address goes to a new tab instead.
    const navigate = location.navigate.bind(location);
    location.navigate = (next, replace) => {
      if (!replace && Date.now() < newTabUntil) {
        newTabUntil = 0;
        tabs.open(next.href, { background: true });
        return;
      }
      navigate(next, replace);
    };

    // ── Keyboard and mouse buttons ───────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.ctrlKey && key === "tab") {
        e.preventDefault();
        tabs.cycle(e.shiftKey ? -1 : 1);
        return;
      }
      if (
        e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        (key === "arrowleft" || key === "arrowright")
      ) {
        // Not while typing: Alt+arrows move words in some editors.
        const el = document.activeElement as HTMLElement | null;
        if (
          el &&
          (el.isContentEditable ||
            el.tagName === "INPUT" ||
            el.tagName === "TEXTAREA")
        )
          return;
        e.preventDefault();
        if (key === "arrowleft") tabs.back();
        else tabs.forward();
        return;
      }
      if (!mod(e) || e.altKey) return;
      if (key === "t" && e.shiftKey) {
        e.preventDefault();
        tabs.reopenClosed();
      } else if (key === "t" && !e.shiftKey) {
        e.preventDefault();
        tabs.open();
      } else if (key === "w" && !e.shiftKey) {
        e.preventDefault();
        const s = tabs.get();
        const active = s.tabs.find((t) => t.id === s.activeId);
        // A pinned tab isn't closed by the shortcut: no accidents.
        if (active && !active.pinned) tabs.close(active.id);
      } else if (key === "pagedown" || key === "pageup") {
        e.preventDefault();
        tabs.cycle(key === "pagedown" ? 1 : -1);
      } else if (/^[1-9]$/.test(e.key) && !e.shiftKey) {
        e.preventDefault();
        tabs.select(Number(e.key));
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
        if (e.button === 3) tabs.back();
        else tabs.forward();
      }
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onLinkClick, true);
    document.addEventListener("auxclick", onLinkClick, true);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("mouseup", onMouseUp, true);
    return () => {
      unlisten();
      location.navigate = navigate;
      setTabNavigator(() => {});
      window.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onLinkClick, true);
      document.removeEventListener("auxclick", onLinkClick, true);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("mouseup", onMouseUp, true);
    };
  }, []);

  return null;
}
