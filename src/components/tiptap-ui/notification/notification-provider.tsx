import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Notification } from "src/types";
import {
  fetchNotifications,
  createNotification,
  patchNotification,
  deleteNotification,
  makeNotification,
  type NotificationRecord,
} from "src/api/notifications";
import { useCurrentPerson } from "src/hooks/use-session";
import {
  NotificationActionsContext,
  NotificationStateContext,
  type NotificationActions,
  type NotificationState,
} from "./notification-context";

function recordToNotification(r: NotificationRecord): Notification {
  return {
    id: r.id,
    type: r.type as Notification["type"],
    title: r.title,
    message: r.message,
    read: r.read,
    timestamp: new Date(r.createdAt), // ← createdAt (number) → timestamp (Date)
    sourcePageId: r.sourcePageId ?? undefined,
    sourcePageTitle: r.sourcePageTitle ?? undefined,
    targetNodeId: r.targetNodeId ?? undefined,
    mentionId: r.mentionId ?? undefined,
    mentionLabel: r.mentionLabel ?? undefined,
  };
}

// DB-backed notification provider. Same context API as before (so the bell and
// existing callers don't change), but notifications are now persisted and
// RECIPIENT-TARGETED: addNotification inserts a row for a recipient, and each
// user reads only their own. Dedup is enforced by the DB (unique dedup_key),
// with an in-memory mirror to avoid redundant inserts within a session.
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { person } = useCurrentPerson();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifiedKeys = useRef<Set<string>>(new Set());

  // Mirror notifications in a ref so markAllRead/dismissAll can read the current
  // list WITHOUT depending on it — keeps those actions stable (Technique 3).
  const notificationsRef = useRef(notifications);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    if (!person) return;
    let cancelled = false;
    fetchNotifications()
      .then((rows) => {
        if (!cancelled) setNotifications(rows.map(recordToNotification));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [person]);

  const hasNotified = useCallback(
    (key: string) => notifiedKeys.current.has(key),
    [],
  );
  const registerNotified = useCallback((key: string) => {
    notifiedKeys.current.add(key);
  }, []);

  // addNotification now needs a recipientId. For back-compat with callers that
  // don't pass one, default the recipient to the current user (self-directed
  // notifications like date reminders).
  const addNotification = useCallback(
    (
      payload: Omit<Notification, "id" | "timestamp" | "read"> & {
        recipientId?: string;
        dedupKey?: string;
      },
    ) => {
      const recipientId = payload.recipientId ?? person?.id;
      if (!recipientId) return;

      // Optimistic local insert (only if the recipient is ME — otherwise it's
      // for someone else and shouldn't show in my bell).
      if (recipientId === person?.id) {
        const optimistic: Notification = {
          ...payload,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date(),
          read: false,
        };
        setNotifications((prev) => [optimistic, ...prev]);
      }

      // Persist for the recipient (fire-and-forget; dedup handled server-side
      // via the unique (recipient_id, dedup_key) index — a conflict is a
      // harmless no-op we swallow).
      createNotification(
        makeNotification({
          recipientId,
          actorId: person?.id ?? null,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          sourcePageId: payload.sourcePageId ?? null,
          sourcePageTitle: payload.sourcePageTitle ?? null,
          targetNodeId: payload.targetNodeId ?? null,
          mentionId: payload.mentionId ?? null,
          mentionLabel: payload.mentionLabel ?? null,
          dedupKey: payload.dedupKey ?? null,
        }),
      )
        .then(() => console.log("notification inserted OK"))
        .catch((e) => console.error("notification insert FAILED:", e));
    },
    [person],
  );
  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    patchNotification(id, { read: true }).catch(() => {});
  }, []);

  // Read the list from the ref, NOT the dep — so this stays stable.
  const markAllRead = useCallback(() => {
    const unreadIds = notificationsRef.current
      .filter((n) => !n.read)
      .map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    unreadIds.forEach((id) =>
      patchNotification(id, { read: true }).catch(() => {}),
    );
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    deleteNotification(id).catch(() => {});
  }, []);

  const dismissAll = useCallback(() => {
    const ids = notificationsRef.current.map((n) => n.id);
    setNotifications([]);
    ids.forEach((id) => deleteNotification(id).catch(() => {}));
  }, []);

  // Actions: now ALL stable → this object never rebuilds.
  const actions = useMemo<NotificationActions>(
    () => ({
      addNotification,
      markRead,
      markAllRead,
      dismiss,
      dismissAll,
      hasNotified,
      registerNotified,
    }),
    [
      addNotification,
      markRead,
      markAllRead,
      dismiss,
      dismissAll,
      hasNotified,
      registerNotified,
    ],
  );

  // State: rebuilds when notifications change (unreadCount derived here).
  const state = useMemo<NotificationState>(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),
    [notifications],
  );

  return (
    <NotificationActionsContext.Provider value={actions}>
      <NotificationStateContext.Provider value={state}>
        {children}
      </NotificationStateContext.Provider>
    </NotificationActionsContext.Provider>
  );
}
