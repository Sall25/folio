import { placeOf } from "../tabs/tab-label";
import { tabs, type Tab } from "../tabs/tabs-store";
import { openPageWindow } from "./page-window";

// A tab becomes its own window (tab menu, or a tab dragged out of the
// window): the window opens on its address and the tab leaves the bar,
// like a browser. A pinned tab stays. Pages and chats only.

export const canOpenInWindow = (path: string) => {
  const kind = placeOf(path).kind;
  return kind === "page" || kind === "chat";
};

export function moveTabToWindow(tab: Tab, at?: { x: number; y: number }) {
  if (!canOpenInWindow(tab.path)) return;
  openPageWindow(tab.path, at);
  if (!tab.pinned) tabs.close(tab.id);
}

/** Where a drag ended, if outside this window (screen coordinates). */
export function droppedOutside(e: { screenX: number; screenY: number }) {
  const left = window.screenX;
  const top = window.screenY;
  const outside =
    e.screenX < left ||
    e.screenY < top ||
    e.screenX > left + window.outerWidth ||
    e.screenY > top + window.outerHeight;
  return outside ? { x: e.screenX, y: e.screenY } : null;
}
