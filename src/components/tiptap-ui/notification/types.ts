export type NotificationType =
  | "user-mention"
  | "date-due"
  | "date-overdue"
  | "backlink";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  // source context
  sourcePageId?: string | number;
  sourcePageTitle?: string;
  // optional extras
  mentionLabel?: string;
  mentionId?: string;
  targetNodeId?: string;
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
