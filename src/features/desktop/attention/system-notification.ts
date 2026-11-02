import { isDesktopApp } from "src/lib/desktop";

// A notification from the system (Windows' notification centre, macOS's,
// the Linux desktop's) through tauri-plugin-notification. Asks for
// permission the first time; says nothing when it's refused.

let permission: Promise<boolean> | null = null;

function allowed(): Promise<boolean> {
  if (permission) return permission;
  permission = (async () => {
    const { isPermissionGranted, requestPermission } = await import(
      "@tauri-apps/plugin-notification"
    );
    if (await isPermissionGranted()) return true;
    return (await requestPermission()) === "granted";
  })().catch(() => false);
  return permission;
}

export async function showSystemNotification(
  title: string,
  body?: string,
): Promise<void> {
  if (!isDesktopApp || !(await allowed())) return;
  try {
    const { sendNotification } = await import(
      "@tauri-apps/plugin-notification"
    );
    sendNotification(body ? { title, body } : { title });
  } catch (e) {
    console.warn("[desktop] couldn't show a notification", e);
  }
}
