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
import { supabase } from "src/api/supabase-client";
import { useCurrentPerson } from "src/hooks/use-session";
import {
  NotificationActionsContext,
  NotificationStateContext,
  type NotificationActions,
  type NotificationState,
} from "./notification-context";

// source_room_id is a newer column (chat mentions); NotificationRecord in
// api/notifications predates it, so it's read as an optional extra here.
type RecordWithRoom = NotificationRecord & { sourceRoomId?: string | null };

function recordToNotification(r: RecordWithRoom): Notification {
  return {
    id: r.id,
    type: r.type as Notification["type"],
    title: r.title,
    message: r.message,
    read: r.read,
    timestamp: new Date(r.createdAt),
    sourcePageId: r.sourcePageId ?? undefined,
    sourcePageTitle: r.sourcePageTitle ?? undefined,
    targetNodeId: r.targetNodeId ?? undefined,
    mentionId: r.mentionId ?? undefined,
    mentionLabel: r.mentionLabel ?? undefined,
    sourceRoomId: r.sourceRoomId ?? undefined,
  };
}

// Realtime payloads are raw snake_case rows (no http() shim in between).
interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: number;
  actor_id: string | null;
  source_page_id: string | null;
  source_page_title: string | null;
  target_node_id: string | null;
  mention_id: string | null;
  mention_label: string | null;
  source_room_id: string | null;
}

function rowToNotification(r: NotificationRow): Notification {
  return {
    id: r.id,
    type: r.type as Notification["type"],
    title: r.title,
    message: r.message,
    read: r.read,
    timestamp: new Date(r.created_at),
    sourcePageId: r.source_page_id ?? undefined,
    sourcePageTitle: r.source_page_title ?? undefined,
    targetNodeId: r.target_node_id ?? undefined,
    mentionId: r.mention_id ?? undefined,
    mentionLabel: r.mention_label ?? undefined,
    sourceRoomId: r.source_room_id ?? undefined,
  };
}

// DB-backed notification provider. Notifications are persisted and
// RECIPIENT-TARGETED: addNotification inserts a row for a recipient, and each
// user reads only their own. New rows for you — including ones created
// server-side, like chat mentions — arrive live over Realtime.
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { person } = useCurrentPerson();
  const personId = person?.id ?? null;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifiedKeys = useRef<Set<string>>(new Set());

  const notificationsRef = useRef(notifications);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    fetchNotifications()
      .then((rows) => {
        if (!cancelled)
          setNotifications(
            (rows as RecordWithRoom[]).map(recordToNotification),
          );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [personId]);

  // Live: rows addressed to me. Rows I created for MYSELF (actor = me, e.g.
  // date reminders) are skipped — addNotification already inserted them
  // optimistically, so the echo would duplicate them.
  useEffect(() => {
    if (!personId) return;
    const channel = supabase
      .channel(`notifications:${personId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${personId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          if (row.actor_id === personId) return;
          setNotifications((prev) =>
            prev.some((n) => n.id === row.id)
              ? prev
              : [rowToNotification(row), ...prev],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${personId}`,
        },
        (payload) => {
          // e.g. marked read in another tab.
          const row = payload.new as NotificationRow;
          setNotifications((prev) =>
            prev.map((n) => (n.id === row.id ? { ...n, read: row.read } : n)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [personId]);

  const hasNotified = useCallback(
    (key: string) => notifiedKeys.current.has(key),
    [],
  );
  const registerNotified = useCallback((key: string) => {
    notifiedKeys.current.add(key);
  }, []);

  const addNotification = useCallback(
    (
      payload: Omit<Notification, "id" | "timestamp" | "read"> & {
        recipientId?: string;
        dedupKey?: string;
      },
    ) => {
      const recipientId = payload.recipientId ?? person?.id;
      if (!recipientId) return;

      if (recipientId === person?.id) {
        const optimistic: Notification = {
          ...payload,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date(),
          read: false,
        };
        setNotifications((prev) => [optimistic, ...prev]);
      }

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
      ).catch((e) => console.error("notification insert failed:", e));
    },
    [person],
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    patchNotification(id, { read: true }).catch(() => {});
  }, []);

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
