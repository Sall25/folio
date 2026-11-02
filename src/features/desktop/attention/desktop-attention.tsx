import { useEffect, useRef, useState } from "react";
import { useNotificationState } from "src/features/inbox/notification/notification-context";
import { setAppBadge } from "./app-badge";
import { showSystemNotification } from "./system-notification";
import { newNotifications } from "./new-notifications";

/** Desktop app, main window: the inbox's unread count on the app's icon
 *  (every workspace), and a system notification for each new one while
 *  Folio isn't the window in front. Types turned off in notification
 *  settings are already left out of the inbox, so they get neither. */
export function DesktopAttention() {
  const { notifications, elsewhere, unreadCount, elsewhereUnreadCount } =
    useNotificationState();
  const total = unreadCount + elsewhereUnreadCount;

  useEffect(() => {
    void setAppBadge(total);
  }, [total]);
  // Signed out (the app unmounts): no count left on the icon.
  useEffect(() => () => void setAppBadge(0), []);

  const shown = useRef(new Set<string>());
  const [startedAt] = useState(() => Date.now());
  useEffect(() => {
    const fresh = newNotifications(
      [...notifications, ...elsewhere],
      shown.current,
      startedAt,
    );
    // In front: the bell and the badge say it.
    if (document.hasFocus()) return;
    for (const n of fresh) void showSystemNotification(n.title, n.message);
  }, [notifications, elsewhere, startedAt]);

  return null;
}
