export type NotificationType = "user-mention" | "date-due" | "date-overdue";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  mentionLabel?: string;
  mentionId?: string;
}
export interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (
    payload: Omit<Notification, "id" | "timestamp" | "read">,
  ) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  hasNotified: (key: string) => boolean;
  registerNotified: (key: string) => void;
}
