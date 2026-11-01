import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isDesktopApp, isMac } from "../platform";

// E · A page in its own window: a small window with just that page (no
// sidebar, no tabs), next to a meeting or a video. It's the same app at the
// page's address, in a window labelled page-…; the app sees the label and
// leaves out the sidebar and tabs (isPageWindow). Same live document: edits
// show in both windows.

const LABEL_PREFIX = "page-";

/** This window shows one page on its own (no sidebar, no tabs). */
export const isPageWindow = (() => {
  if (!isDesktopApp) return false;
  try {
    return getCurrentWindow().label.startsWith(LABEL_PREFIX);
  } catch {
    return false;
  }
})();

/** Opens `path` in a new window, at screen point (x, y) when given (a tab
 *  dragged out of the bar), else beside the main window. */
export function openPageWindow(path: string, at?: { x: number; y: number }) {
  if (!isDesktopApp) return;
  const width = 760;
  const height = 820;
  const position = at
    ? {
        x: Math.max(0, Math.round(at.x - width / 2)),
        y: Math.max(0, Math.round(at.y - 20)),
      }
    : {};
  const win = new WebviewWindow(`${LABEL_PREFIX}${Date.now()}`, {
    url: path,
    title: "Folio",
    width,
    height,
    minWidth: 400,
    minHeight: 400,
    ...position,
    center: !at,
    // Like the main window: Folio's own title bar (macOS keeps its traffic
    // lights), and drops left to the page (block drag and drop).
    ...(isMac
      ? {
          decorations: true,
          titleBarStyle: "overlay" as const,
          hiddenTitle: true,
        }
      : { decorations: false }),
    dragDropEnabled: false,
  });
  win.once("tauri://error", (e) =>
    console.error("Couldn't open the window:", e),
  );
}
