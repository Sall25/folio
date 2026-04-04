import { useCallback, useRef, useState, type ReactNode } from "react";
import { NotificationContext } from "./notification-context";
import type { Notification } from "./types";

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // Track which mention+event keys have already fired so we don't double-notify
  const notifiedKeys = useRef<Set<string>>(new Set());

  const hasNotified = useCallback((key: string) => {
    return notifiedKeys.current.has(key);
  }, []);

  const registerNotified = useCallback((key: string) => {
    notifiedKeys.current.add(key);
  }, []);

  const addNotification = useCallback(
    (payload: Omit<Notification, "id" | "timestamp" | "read">) => {
      const newNotification: Notification = {
        ...payload,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date(),
        read: false,
      };
      setNotifications((prev) => [newNotification, ...prev]);
    },
    [],
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAllRead,
        markRead,
        dismiss,
        dismissAll,
        hasNotified,
        registerNotified,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
