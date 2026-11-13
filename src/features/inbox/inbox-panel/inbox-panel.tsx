import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Inbox as InboxIcon,
  AtSign,
  Calendar,
  Link2,
  Check,
  ChevronRight,
  MessagesSquare,
  Eye,
  UserPlus,
} from "src/components/icons";
import { useNotifications } from "src/features/inbox/notification/notification-context";
import type { Notification, NotificationType } from "src/types";
import { useOpenNotification } from "./use-open-notification";
import { WorkspaceInvites } from "./workspace-invites";
import { TeamspaceInvites } from "./teamspace-invites";
import { NotificationCard } from "./notification-card";
import { DevTestNotifications } from "./dev-test-notifications";
import { NavigableMenuItem } from "src/features/database/components/navigable-menu-item";
import { formatRelativeTime } from "src/utils/format-relative";
import { useMyWorkspaceInvites } from "src/hooks/use-workspace-members";
import { useMyInvites } from "src/hooks/use-teamspace-members";
import { FLYOUT_GAP, flyoutSideOffset, rowRightEdge } from "./flyout-offset";
import "./inbox-panel.scss";

export function InboxPanel({ onOpened }: { onOpened?: () => void } = {}) {
  const { t, i18n } = useTranslation();
  // Already scoped to this workspace and to your notification settings.
  const {
    notifications,
    unreadCount,
    elsewhere,
    elsewhereUnreadCount,
    markAllRead,
  } = useNotifications();
  const open = useOpenNotification(onOpened);
  const { data: invites = [] } = useMyWorkspaceInvites();
  const { invites: teamspaceInvites } = useMyInvites();
  const [showElsewhere, setShowElsewhere] = useState(false);

  // How the last press on a notification was made: a tap opens its card
  // (no hover on touch screens) instead of opening it straight away.
  const pointerType = useRef("mouse");

  // The card opens beside the panel, not on top of it. Radix measures the
  // offset from the row, which stops short of the panel's edge, so the two
  // edges are measured and the difference added (see ./flyout-offset).
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [cardOffset, setCardOffset] = useState(FLYOUT_GAP);

  useEffect(() => {
    const panel = panelRef.current;
    const body = bodyRef.current;
    if (!panel || !body) return;

    const measure = () =>
      setCardOffset(
        flyoutSideOffset(
          rowRightEdge(body),
          panel.getBoundingClientRect().right,
        ),
      );

    measure();
    // The sidebar is resizable, and a long list grows a scrollbar: both move
    // the row's edge.
    const ro = new ResizeObserver(measure);
    ro.observe(panel);
    ro.observe(body);
    return () => ro.disconnect();
  }, []);

  // A short preview in the list; hovering (or tapping) it opens the whole
  // notification on a side card, with Open / Mark as read / Dismiss.
  const item = (n: Notification) => (
    <NavigableMenuItem
      key={n.id}
      side="right"
      align="start"
      sideOffset={cardOffset}
      collisionPadding={8}
      anchor={
        <button
          type="button"
          className={`inbox-item${n.read ? "" : " is-unread"}`}
          onPointerDown={(e) => {
            pointerType.current = e.pointerType;
          }}
          onClick={() => {
            if (pointerType.current === "touch") return;
            void open(n);
          }}
        >
          <span className="inbox-item__icon">
            <NotifIcon type={n.type} />
          </span>
          <span className="inbox-item__text">
            <span className="inbox-item__title">{n.title}</span>
            {n.message && (
              <span className="inbox-item__message">{n.message}</span>
            )}
            <span className="inbox-item__time">
              {formatRelativeTime(n.timestamp.getTime(), t, i18n.language)}
            </span>
          </span>
          {!n.read && <span className="inbox-item__dot" />}
          <ChevronRight size={14} className="inbox-item__more" />
        </button>
      }
    >
      {(close) => (
        <NotificationCard
          notification={n}
          icon={<NotifIcon type={n.type} />}
          onOpen={() => void open(n)}
          onClose={close}
        />
      )}
    </NavigableMenuItem>
  );

  return (
    <div className="inbox-panel" ref={panelRef}>
      <div className="inbox-panel__header">
        <span className="inbox-panel__title">
          {unreadCount > 0 && (
            <>
              {t("sidebar.inbox")}
              <span className="inbox-panel__count">{unreadCount}</span>
            </>
          )}
        </span>
        <span className="inbox-panel__actions">
          {/* Development only: send yourself test notifications. */}
          {import.meta.env.DEV && <DevTestNotifications />}
          {unreadCount > 0 && (
            <button
              type="button"
              className="inbox-panel__mark-all"
              onClick={() => markAllRead()}
            >
              <Check size={13} />
              <span>{t("inbox.markAllRead", "Mark all read")}</span>
            </button>
          )}
        </span>
      </div>

      <div className="inbox-panel__body" ref={bodyRef}>
        <WorkspaceInvites onDone={onOpened} />
        <TeamspaceInvites onDone={onOpened} />
        {notifications.length === 0 &&
        elsewhere.length === 0 &&
        invites.length === 0 &&
        teamspaceInvites.length === 0 ? (
          <div className="inbox-panel__empty">
            <InboxIcon size={26} strokeWidth={1.5} />
            <p>{t("inbox.empty", "No notifications")}</p>
          </div>
        ) : (
          <>
            {notifications.map(item)}

            {elsewhere.length > 0 && (
              <div className="inbox-panel__elsewhere">
                <button
                  type="button"
                  className="inbox-panel__elsewhere-toggle"
                  aria-expanded={showElsewhere}
                  onClick={() => setShowElsewhere((v) => !v)}
                >
                  <ChevronRight
                    size={13}
                    style={{
                      transform: showElsewhere ? "rotate(90deg)" : "none",
                      transition: "transform 150ms ease",
                    }}
                  />
                  <span>{t("inbox.otherWorkspaces")}</span>
                  {elsewhereUnreadCount > 0 && (
                    <span className="inbox-panel__count">
                      {elsewhereUnreadCount}
                    </span>
                  )}
                </button>
                {showElsewhere && elsewhere.map(item)}
              </div>
            )}
          </>
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
    case "row-look":
      return <Eye size={15} />;
    case "row-assign":
      return <UserPlus size={15} />;
    default:
      return <InboxIcon size={15} />;
  }
}
