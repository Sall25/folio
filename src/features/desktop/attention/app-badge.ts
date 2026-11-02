import { isDesktopApp } from "src/lib/desktop";

// The unread count on the app's icon: a badge on the dock (macOS) or the
// launcher (Linux, where the desktop supports it), a small red disc over the
// taskbar button on Windows, which has no badge count.

const isWindows =
  typeof navigator !== "undefined" && /Windows/i.test(navigator.userAgent);

/** The Windows overlay: a red disc with the count ("9+" above 9), as PNG. */
async function overlayPng(count: number): Promise<Uint8Array | null> {
  const size = 32; // shown at 16px; drawn at 32 for sharp high-DPI screens
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#e5484d";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  const label = count > 9 ? "9+" : String(count);
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${label.length > 1 ? 17 : 21}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, size / 2, size / 2 + 1);
  const blob = await new Promise<Blob | null>((r) =>
    canvas.toBlob(r, "image/png"),
  );
  return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
}

/** Shows `count` on the app's icon; 0 removes it. */
export async function setAppBadge(count: number): Promise<void> {
  if (!isDesktopApp) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    if (isWindows) {
      const png = count > 0 ? await overlayPng(count) : null;
      await win.setOverlayIcon(png ?? undefined);
    } else {
      await win.setBadgeCount(count > 0 ? count : undefined);
    }
  } catch (e) {
    console.warn("[desktop] couldn't set the app badge", e);
  }
}
