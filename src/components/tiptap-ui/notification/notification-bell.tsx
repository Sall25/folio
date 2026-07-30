import { useEffect, useRef, useState } from "react";
import { useNotificationContext } from "./use-notification-context";
import type { Notification, NotificationType } from "src/types";

import "./notification-bell.scss";
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Bell } from "lucide-react";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";

// ── Icons (inline SVG, no extra dep) ──────────────────────────────────────
function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function AtIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="tiptap-button-icon"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function typeIcon(type: NotificationType) {
  if (type === "user-mention") return <AtIcon />;
  if (type === "date-overdue") return <AlertIcon />;
  return <CalendarIcon />;
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAllRead,
    markRead,
    dismiss,
    dismissAll,
  } = useNotificationContext();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { setActivePageId } = useActivePage();
  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleBellClick = () => setOpen((v) => !v);

  const handleNotificationClick = (notification: Notification) => {
    markRead(notification.id);
    if (notification.sourcePageId !== undefined) {
      setActivePageId(notification.sourcePageId as string);
    }
    // scroll after page has switched and content has rendered
    if (notification.targetNodeId) {
      setTimeout(() => {
        const el = document.querySelector(
          `[data-node-id="${notification.targetNodeId}"]`,
        );
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("notification-highlight");
          setTimeout(() => el.classList.remove("notification-highlight"), 2000);
        }
      }, 300); // give page switch time to settle
    }
  };
  return (
    <Popover>
      <div className="notif-bell-root">
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="notif-bell-btn"
            onClick={handleBellClick}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          >
            <Bell className="tiptap-button-icon" />
            {unreadCount > 0 && (
              <span className="notif-badge" aria-hidden="true">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <Card
            className="notif-dropdown"
            role="dialog"
            aria-label="Notifications"
          >
            {/* Header */}
            <CardHeader className="notif-header">
              <h3>Notifications</h3>
              <div className="notif-header-actions">
                {unreadCount > 0 && (
                  <button className="notif-action-btn" onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button className="notif-action-btn" onClick={dismissAll}>
                    Clear all
                  </button>
                )}
              </div>
            </CardHeader>

            {/* List */}
            <CardBody className="notif-list" role="list">
              {notifications.length === 0 ? (
                <CardGroupLabel className="notif-empty">
                  <BellIcon />
                  <span>No notifications yet</span>
                </CardGroupLabel>
              ) : (
                notifications.map((n: Notification) => (
                  <CardItemGroup
                    key={n.id}
                    orientation="horizontal"
                    className={`notif-item${n.read ? "" : " unread"}`}
                    role="listitem"
                    onClick={() => handleNotificationClick(n)}
                  >
                    {/* Type icon */}
                    <div className={`notif-icon type-${n.type}`}>
                      {typeIcon(n.type)}
                    </div>

                    {/* Text */}
                    <div className="notif-body">
                      <div className="notif-title">{n.title}</div>
                      <div className="notif-message">{n.message}</div>
                      <div className="notif-time">
                        {relativeTime(n.timestamp)}
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!n.read && (
                      <div className="notif-unread-dot" aria-hidden="true" />
                    )}

                    {/* Per-item dismiss */}
                    <Button
                      variant="ghost"
                      className="notif-dismiss"
                      aria-label="Dismiss notification"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismiss(n.id);
                      }}
                    >
                      <CloseIcon />
                    </Button>
                  </CardItemGroup>
                ))
              )}
            </CardBody>
          </Card>
        </PopoverContent>
      </div>
    </Popover>
  );
}
