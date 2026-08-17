import { useTranslation } from "react-i18next";
import {
  Inbox as InboxIcon,
  AtSign,
  Calendar,
  Link2,
  Check,
} from "lucide-react";
import { useNotifications } from "src/components/tiptap-ui/notification/notification-context";
import type { Notification, NotificationType } from "src/types";
import { useActivePageActions } from "../../context/active-page-context";
import { setPendingScrollTarget } from "./pending-scroll-target";
import "./inbox-panel.scss";

// The notification inbox, rendered in the sidebar body when the Inbox tab is
// active (replacing the page tree). Reuses the notification data layer; clicking
// a notification marks it read and navigates to its source page/thread.
export function InboxPanel() {
  const { t } = useTranslation();
  const { notifications, markRead, markAllRead, unreadCount } =
    useNotifications();

  const { setActivePageId } = useActivePageActions();

  const handleClick = (n: Notification) => {
    markRead(n.id);
    if (n.sourcePageId != null) {
      const pageId = String(n.sourcePageId);
      // Set the scroll target BEFORE navigating; the destination editor reads
      // and clears it once the page has rendered (via useScrollToPendingTarget).
      setPendingScrollTarget({
        pageId,
        targetNodeId: n.targetNodeId,
        type: n.type,
      });
      setActivePageId(pageId);
      // navigate({ to: "/" });
    }
  };

  return (
    <div className="inbox-panel">
      <div className="inbox-panel__header">
        <span className="inbox-panel__title">
          {t("sidebar.inbox")}
          {unreadCount > 0 && (
            <span className="inbox-panel__count">{unreadCount}</span>
          )}
        </span>
        {unreadCount > 0 && (
          <button
            type="button"
            className="inbox-panel__mark-all"
            onClick={markAllRead}
          >
            <Check size={13} />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      <div className="inbox-panel__body">
        {notifications.length === 0 ? (
          <div className="inbox-panel__empty">
            <InboxIcon size={26} strokeWidth={1.5} />
            <p>{t("inbox.empty", "No notifications")}</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              type="button"
              key={n.id}
              className={`inbox-item${n.read ? "" : " is-unread"}`}
              onClick={() => handleClick(n)}
            >
              <span className="inbox-item__icon">
                <NotifIcon type={n.type} />
              </span>
              <span className="inbox-item__text">
                <span className="inbox-item__title">{n.title}</span>
                <span className="inbox-item__message">{n.message}</span>
                <span className="inbox-item__time">
                  {n.timestamp.toLocaleString()}
                </span>
              </span>
              {!n.read && <span className="inbox-item__dot" />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function NotifIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case "user-mention":
    case "comment-mention":
      return <AtSign size={15} />;
    case "date-due":
    case "date-overdue":
      return <Calendar size={15} />;
    case "backlink":
      return <Link2 size={15} />;
    default:
      return <InboxIcon size={15} />;
  }
}
