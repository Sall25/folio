import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Notification, Page } from "src/types";
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
import { usePagesBase } from "src/hooks/use-pages";
import { useChatRooms } from "src/hooks/use-chat";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
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

const allPagesLens = (pages: Page[]) => pages;

const byNewest = (a: Notification, b: Notification) =>
  b.timestamp.getTime() - a.timestamp.getTime();

// DB-backed notification provider. Notifications are persisted and
// RECIPIENT-TARGETED: addNotification inserts a row for a recipient, and each
// user reads only their own. New rows for you — including ones created
// server-side, like chat mentions — arrive live over Realtime.
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { person } = useCurrentPerson();
  const personId = person?.id ?? null;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifiedKeys = useRef<Set<string>>(new Set());
  // True once the first fetch has answered (or failed): reminders wait for it
  // so they can tell which ones were already sent.
  const [ready, setReady] = useState(false);

  const notificationsRef = useRef(notifications);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    fetchNotifications()
      .then((rows) => {
        if (cancelled) return;
        // Remember what was already sent, so hasNotified() knows about
        // notifications from earlier sessions too.
        for (const r of rows) {
          if (r.dedupKey) notifiedKeys.current.add(r.dedupKey);
        }
        // The fetch also returns notifications I sent to other people (the
        // select rule lets the actor read them, for the dedup keys above).
        // They're not mine to show or mark read: marking one read changed
        // nothing on the server (only the recipient can), so it came back.
        setNotifications(
          (rows as RecordWithRoom[])
            .filter((r) => r.recipientId === personId)
            .map(recordToNotification)
            .sort(byNewest),
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [personId]);

  // Live: rows addressed to me. My own rows (e.g. reminders) are already in
  // the list under the same id, so their echo is skipped by the id check —
  // and ones made in another tab still arrive.
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
      .on(
        "postgres_changes",
        // Dismissed in another tab. Delete events can't be filtered by
        // recipient (they only carry the id), so unknown ids are ignored.
        { event: "DELETE", schema: "public", table: "notifications" },
        (payload) => {
          const id = (payload.old as { id?: string } | null)?.id;
          if (!id) return;
          setNotifications((prev) =>
            prev.some((n) => n.id === id)
              ? prev.filter((n) => n.id !== id)
              : prev,
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

      const record = makeNotification({
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
      });

      // Your own (e.g. a reminder) shows right away, under the SAME id the
      // row is saved with — so marking it read or dismissing it reaches the
      // saved row.
      if (recipientId === person?.id) {
        setNotifications((prev) => [recordToNotification(record), ...prev]);
      }

      createNotification(record).catch((e) =>
        console.error("notification insert failed:", e),
      );
    },
    [person],
  );

  // ── Which notifications belong to the current workspace ────────────────
  // A notification is "here" when what it points to is reachable here: its
  // page is in this workspace's page list (that includes joined teamspaces),
  // or its chat room is a DM, a room of this workspace, or a room of a
  // teamspace you see here. Anything else is for another workspace (or no
  // longer reachable) and stays out of the badge.
  const { workspaceId } = useCurrentWorkspace();
  const { data: pages } = usePagesBase(allPagesLens);
  const { all: rooms, isLoading: roomsLoading } = useChatRooms();
  const settings = person?.notificationSettings;

  const { here, elsewhere } = useMemo(() => {
    // Until pages and rooms have loaded there's no telling — show nothing
    // rather than a badge that jumps.
    if (!pages || roomsLoading) return { here: [], elsewhere: [] };

    const pageIds = new Set(pages.map((p) => p.id));
    const roomsById = new Map(rooms.map((r) => [r.id, r]));

    const isHere = (n: Notification) => {
      if (n.sourcePageId != null) return pageIds.has(String(n.sourcePageId));
      if (n.sourceRoomId) {
        const room = roomsById.get(n.sourceRoomId);
        if (!room) return false;
        if (room.kind === "dm") return true;
        if (room.teamspaceId) return pageIds.has(room.teamspaceId);
        return room.workspaceId === workspaceId;
      }
      return true;
    };

    const here: Notification[] = [];
    const elsewhere: Notification[] = [];
    for (const n of notifications) {
      if (settings?.[n.type] === false) continue; // turned off in settings
      (isHere(n) ? here : elsewhere).push(n);
    }
    return { here, elsewhere };
  }, [notifications, pages, rooms, roomsLoading, workspaceId, settings]);

  const hereRef = useRef(here);
  useEffect(() => {
    hereRef.current = here;
  }, [here]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    patchNotification(id, { read: true }).catch(() => {});
  }, []);

  const markAllRead = useCallback((ids?: string[]) => {
    const target = new Set(ids ?? hereRef.current.map((n) => n.id));
    const unreadIds = notificationsRef.current
      .filter((n) => !n.read && target.has(n.id))
      .map((n) => n.id);
    if (unreadIds.length === 0) return;
    const unread = new Set(unreadIds);
    setNotifications((prev) =>
      prev.map((n) => (unread.has(n.id) ? { ...n, read: true } : n)),
    );
    unreadIds.forEach((id) =>
      patchNotification(id, { read: true }).catch(() => {}),
    );
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    deleteNotification(id).catch(() => {});
  }, []);

  const dismissAll = useCallback((ids?: string[]) => {
    const target = new Set(ids ?? hereRef.current.map((n) => n.id));
    setNotifications((prev) => prev.filter((n) => !target.has(n.id)));
    target.forEach((id) => deleteNotification(id).catch(() => {}));
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
      notifications: here,
      unreadCount: here.filter((n) => !n.read).length,
      elsewhere,
      elsewhereUnreadCount: elsewhere.filter((n) => !n.read).length,
      ready,
    }),
    [here, elsewhere, ready],
  );

  return (
    <NotificationActionsContext.Provider value={actions}>
      <NotificationStateContext.Provider value={state}>
        {children}
      </NotificationStateContext.Provider>
    </NotificationActionsContext.Provider>
  );
}
