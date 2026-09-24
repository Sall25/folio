import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-location";
import {
  Inbox as InboxIcon,
  AtSign,
  Calendar,
  Link2,
  Check,
  MessagesSquare,
} from "lucide-react";
import { useNotifications } from "src/components/tiptap-ui/notification/notification-context";
import { useCurrentPerson } from "src/hooks/use-session";
import { useChatRooms } from "src/hooks/use-chat";
import type { Notification, NotificationType } from "src/types";
import { useActivePageActions } from "../../context/active-page-context";
import { chatPath, useOpenChatRoom } from "../chat/chat-utils";
import { setPageChatOpen } from "../chat/page-chat-store";
import { setPendingScrollTarget } from "./pending-scroll-target";
import "./inbox-panel.scss";

export function InboxPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notifications, markRead, markAllRead } = useNotifications();
  const { person } = useCurrentPerson();
  const { setActivePageId } = useActivePageActions();
  const { all: rooms } = useChatRooms();
  const openRoom = useOpenChatRoom();

  const settings = person?.notificationSettings ?? {};
  const visibleNotifications = notifications.filter(
    (n) => settings[n.type] ?? true,
  );
  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  const handleClick = (n: Notification) => {
    markRead(n.id);

    if (n.type === "chat-mention") {
      // Land on the exact message: the room view consumes this target (keyed
      // by room id) once its messages are rendered.
      if (n.sourceRoomId && n.targetNodeId) {
        setPendingScrollTarget({
          pageId: n.sourceRoomId,
          targetNodeId: n.targetNodeId,
          type: "chat-message",
        });
      }

      // Page discussion → the page with its drawer.
      if (n.sourcePageId) {
        setActivePageId(String(n.sourcePageId));
        setPageChatOpen(true);
        return;
      }
      // Room or DM → the room, in the right space.
      if (n.sourceRoomId) {
        const room = rooms.find((r) => r.id === n.sourceRoomId);
        if (room) openRoom(room);
        else navigate({ to: chatPath(null, n.sourceRoomId) });
      }
      return;
    }

    if (n.sourcePageId != null) {
      const pageId = String(n.sourcePageId);
      setPendingScrollTarget({
        pageId,
        targetNodeId: n.targetNodeId,
        type: n.type,
      });
      setActivePageId(pageId);
    }
  };

  return (
    <div className="inbox-panel">
      <div className="inbox-panel__header">
        <span className="inbox-panel__title">
          {unreadCount > 0 && (
            <>
              {t("sidebar.inbox")}
              <span className="inbox-panel__count">{unreadCount}</span>
            </>
          )}
        </span>
        {unreadCount > 0 && (
          <button
            type="button"
            className="inbox-panel__mark-all"
            onClick={markAllRead}
          >
            <Check size={13} />
            <span>{t("inbox.markAllRead", "Mark all read")}</span>
          </button>
        )}
      </div>

      <div className="inbox-panel__body">
        {visibleNotifications.length === 0 ? (
          <div className="inbox-panel__empty">
            <InboxIcon size={26} strokeWidth={1.5} />
            <p>{t("inbox.empty", "No notifications")}</p>
          </div>
        ) : (
          visibleNotifications.map((n) => (
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
    case "chat-mention":
      return <MessagesSquare size={15} />;
    case "date-due":
    case "date-overdue":
      return <Calendar size={15} />;
    case "backlink":
      return <Link2 size={15} />;
    default:
      return <InboxIcon size={15} />;
  }
}
