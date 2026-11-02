import { isDesktopApp } from "src/lib/desktop";

// A maximized window without the system frame (the desktop app draws its
// own title bar) can come out bigger than the screen's work area on
// Windows: as tall as the whole screen, its bottom under the taskbar, which
// hides whatever sits at the bottom (the rail's account, the sidebar's last
// rows, the page's foot). This measures how far the window reaches past the
// work area on each side while it's maximized and keeps the app inside it,
// through --window-inset-top/right/bottom/left on <html>
// (desktop-title-bar.scss). 0 everywhere when it isn't maximized, or on a
// system that sizes it right.

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** How far `win` reaches past `area` on each side, in CSS pixels (both
 *  given in physical pixels). Exported for the tests. */
export function insetsFor(win: Rect, area: Rect, scale: number): Insets {
  const px = (n: number) => Math.max(0, Math.round(n / (scale || 1)));
  return {
    top: px(area.y - win.y),
    left: px(area.x - win.x),
    bottom: px(win.y + win.height - (area.y + area.height)),
    right: px(win.x + win.width - (area.x + area.width)),
  };
}

const NONE: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

function apply(insets: Insets) {
  const style = document.documentElement.style;
  for (const side of ["top", "right", "bottom", "left"] as const) {
    style.setProperty(`--window-inset-${side}`, `${insets[side]}px`);
  }
}

let installed = false;

/** Call once at start (main.tsx), in every window. Does nothing on the web. */
export async function installWindowInsets(): Promise<void> {
  if (!isDesktopApp || installed) return;
  installed = true;
  try {
    const { getCurrentWindow, currentMonitor } =
      await import("@tauri-apps/api/window");
    const win = getCurrentWindow();

    let pending = 0;
    const update = async () => {
      const run = ++pending;
      let insets = NONE;
      try {
        if (await win.isMaximized()) {
          const [pos, size, monitor] = await Promise.all([
            win.outerPosition(),
            win.outerSize(),
            currentMonitor(),
          ]);
          if (monitor) {
            const { position, size: area } = monitor.workArea;
            insets = insetsFor(
              { x: pos.x, y: pos.y, width: size.width, height: size.height },
              {
                x: position.x,
                y: position.y,
                width: area.width,
                height: area.height,
              },
              monitor.scaleFactor,
            );
          }
        }
      } catch {
        /* keep the app as it is */
      }
      // Only the latest measurement counts (resizes come in bursts).
      if (run === pending) apply(insets);
    };

    await update();
    await win.onResized(() => void update());
    await win.onMoved(() => void update());
  } catch (e) {
    console.warn("[desktop] couldn't watch the window's size", e);
  }
}
