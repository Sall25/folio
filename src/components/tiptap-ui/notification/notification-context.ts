import { createContext, useContext } from "react";
import type { Notification } from "src/types";

export interface NotificationActions {
  addNotification: (
    payload: Omit<Notification, "id" | "timestamp" | "read"> & {
      recipientId?: string;
      dedupKey?: string;
    },
  ) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  hasNotified: (key: string) => boolean;
  registerNotified: (key: string) => void;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}

export const NotificationActionsContext =
  createContext<NotificationActions | null>(null);
export const NotificationStateContext = createContext<NotificationState | null>(
  null,
);

export function useNotificationActions() {
  const ctx = useContext(NotificationActionsContext);
  if (!ctx)
    throw new Error("useNotificationActions outside NotificationProvider");
  return ctx;
}
export function useNotificationState() {
  const ctx = useContext(NotificationStateContext);
  if (!ctx)
    throw new Error("useNotificationState outside NotificationProvider");
  return ctx;
}
// back-compat shim (delete after migrating consumers):
export function useNotifications() {
  return { ...useNotificationActions(), ...useNotificationState() };
}
