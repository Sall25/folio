// Which desktop the app runs on: the title bar differs (window buttons on
// the right on Windows and Linux; macOS keeps its own on the left) and so
// does the shortcut key (Ctrl / Cmd).
export { isDesktopApp } from "src/lib/desktop";

export const isMac =
  typeof navigator !== "undefined" &&
  /Mac/i.test(navigator.platform || navigator.userAgent);
