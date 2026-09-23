import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "src/api/supabase-client";
import {
  addChatMembers,
  createChatRoom,
  deleteChatMessage,
  fetchChatMessages,
  fetchChatPeople,
  fetchChatRooms,
  fetchUnreadCounts,
  joinChatRoom,
  leaveChatRoom,
  markChatRead,
  openDm,
  sendChatMessage,
  toMessage,
  type MessageRow,
} from "src/api/chat";
import type { ChatMessage, ChatRoom, ChatVisibility } from "src/types";
import { useCurrentPerson } from "./use-session";
import { useCurrentWorkspace } from "./use-workspaces";
import { useCurrentSpace } from "./use-current-space";

export const chatKeys = {
  all: ["chat"] as const,
  rooms: (workspaceId: string) => ["chat", "rooms", workspaceId] as const,
  messages: (roomId: string) => ["chat", "messages", roomId] as const,
  unread: () => ["chat", "unread"] as const,
  people: (ids: string[]) => ["chat", "people", ...ids] as const,
};

// "Active now" in the rooms list: a message within this window.
export const ACTIVE_WINDOW_MS = 10 * 60 * 1000;

// ── Rooms ─────────────────────────────────────────────────────────────────

// Rooms for the current space, plus your DMs (DMs aren't tied to a space):
//   • workspace → workspace rooms (no teamspace);
//   • teamspace → that teamspace's rooms.
export function useChatRooms() {
  const { workspaceId } = useCurrentWorkspace();
  const space = useCurrentSpace();
  const teamspaceId = space.kind === "teamspace" ? space.id : null;

  const query = useQuery({
    queryKey: chatKeys.rooms(workspaceId ?? ""),
    queryFn: fetchChatRooms,
    enabled: !!workspaceId,
  });

  const { rooms, dms } = useMemo(() => {
    const all = query.data ?? [];
    return {
      rooms: all.filter(
        (r) =>
          r.kind === "room" &&
          (teamspaceId
            ? r.teamspaceId === teamspaceId
            : r.teamspaceId == null && r.workspaceId === workspaceId),
      ),
      dms: all.filter((r) => r.kind === "dm"),
    };
  }, [query.data, teamspaceId, workspaceId]);

  return { rooms, dms, all: query.data ?? [], isLoading: query.isLoading };
}

export function useChatRoom(roomId: string | null) {
  const { all, isLoading } = useChatRooms();
  return {
    room: roomId ? (all.find((r) => r.id === roomId) ?? null) : null,
    isLoading,
  };
}

export function useUnreadCounts() {
  const { person } = useCurrentPerson();
  return useQuery({
    queryKey: chatKeys.unread(),
    queryFn: fetchUnreadCounts,
    enabled: !!person,
    staleTime: 30_000,
  });
}

// Names/avatars for a set of people (DM partners, members from other
// workspaces). Stable key: sorted ids.
export function useChatPeople(ids: string[]) {
  const sorted = useMemo(() => [...new Set(ids)].sort(), [ids]);
  return useQuery({
    queryKey: chatKeys.people(sorted),
    queryFn: () => fetchChatPeople(sorted),
    enabled: sorted.length > 0,
    staleTime: 5 * 60_000,
  });
}

// ── Realtime ──────────────────────────────────────────────────────────────

function appendOrReplace(
  qc: QueryClient,
  roomId: string,
  message: ChatMessage,
) {
  qc.setQueryData<ChatMessage[]>(chatKeys.messages(roomId), (old) => {
    if (!old) return old;
    const i = old.findIndex((m) => m.id === message.id);
    if (i === -1) return [...old, message];
    const next = old.slice();
    next[i] = message;
    return next;
  });
}

// Mount ONCE (e.g. in the sidebar). Any message you can see (RLS applies to
// postgres_changes) refreshes unread counts and room ordering, and updates an
// already-open room's cache.
export function useChatRealtimeSync() {
  const qc = useQueryClient();
  const { person } = useCurrentPerson();

  useEffect(() => {
    if (!person) return;
    const channel = supabase
      .channel("chat:messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = (payload.new ?? {}) as MessageRow;
          if (row.room_id) appendOrReplace(qc, row.room_id, toMessage(row));
          qc.invalidateQueries({ queryKey: chatKeys.unread() });
          qc.invalidateQueries({ queryKey: ["chat", "rooms"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, person]);
}

// ── Messages ──────────────────────────────────────────────────────────────

export function useChatMessages(roomId: string | null) {
  return useQuery({
    queryKey: chatKeys.messages(roomId ?? ""),
    queryFn: () => fetchChatMessages(roomId!),
    enabled: !!roomId,
  });
}

export function useSendMessage(roomId: string | null) {
  const qc = useQueryClient();
  const { person } = useCurrentPerson();

  return useMutation({
    mutationFn: (args: { body: string; replyToId?: string | null }) => {
      if (!roomId || !person) throw new Error("Not ready");
      return sendChatMessage({
        id: crypto.randomUUID(),
        roomId,
        authorId: person.id,
        body: args.body,
        replyToId: args.replyToId,
      });
    },
    // Optimistic: show the message immediately. The realtime echo carries
    // the same id, so appendOrReplace dedupes it.
    onMutate: async (args) => {
      if (!roomId || !person) return;
      const optimistic: ChatMessage = {
        id: `pending-${crypto.randomUUID()}`,
        roomId,
        authorId: person.id,
        body: args.body,
        replyToId: args.replyToId ?? null,
        createdAt: Date.now(),
        editedAt: null,
        deletedAt: null,
      };
      appendOrReplace(qc, roomId, optimistic);
      return { optimisticId: optimistic.id };
    },
    onSuccess: (saved, _args, ctx) => {
      if (!roomId) return;
      qc.setQueryData<ChatMessage[]>(chatKeys.messages(roomId), (old) => {
        if (!old) return old;
        const withoutPending = old.filter((m) => m.id !== ctx?.optimisticId);
        return withoutPending.some((m) => m.id === saved.id)
          ? withoutPending
          : [...withoutPending, saved];
      });
    },
    onError: (_err, _args, ctx) => {
      if (!roomId) return;
      qc.setQueryData<ChatMessage[]>(chatKeys.messages(roomId), (old) =>
        old?.filter((m) => m.id !== ctx?.optimisticId),
      );
    },
  });
}

export function useDeleteMessage(roomId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteChatMessage(id),
    onMutate: (id) => {
      if (!roomId) return;
      qc.setQueryData<ChatMessage[]>(chatKeys.messages(roomId), (old) =>
        old?.map((m) => (m.id === id ? { ...m, deletedAt: Date.now() } : m)),
      );
    },
  });
}

// Mark a room read now and whenever its message count grows while open.
export function useMarkRoomRead(roomId: string | null, messageCount: number) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!roomId) return;
    markChatRead(roomId)
      .then(() => qc.invalidateQueries({ queryKey: chatKeys.unread() }))
      .catch(() => {});
  }, [roomId, messageCount, qc]);
}

// ── Room management ───────────────────────────────────────────────────────

function useInvalidateRooms() {
  const qc = useQueryClient();
  return useCallback(
    () => qc.invalidateQueries({ queryKey: ["chat", "rooms"] }),
    [qc],
  );
}

export function useCreateChatRoom() {
  const invalidate = useInvalidateRooms();
  const space = useCurrentSpace();
  return useMutation({
    mutationFn: (args: {
      name: string;
      icon?: string | null;
      visibility: ChatVisibility;
      memberIds: string[];
    }) =>
      createChatRoom({
        ...args,
        teamspaceId: space.kind === "teamspace" ? space.id : null,
      }),
    onSuccess: invalidate,
  });
}

export function useOpenDm() {
  const invalidate = useInvalidateRooms();
  return useMutation({
    mutationFn: (otherPersonId: string) => openDm(otherPersonId),
    onSuccess: invalidate,
  });
}

export function useJoinChatRoom() {
  const invalidate = useInvalidateRooms();
  return useMutation({
    mutationFn: (roomId: string) => joinChatRoom(roomId),
    onSuccess: invalidate,
  });
}

export function useAddChatMembers() {
  const invalidate = useInvalidateRooms();
  return useMutation({
    mutationFn: (args: { roomId: string; memberIds: string[] }) =>
      addChatMembers(args.roomId, args.memberIds),
    onSuccess: invalidate,
  });
}

export function useLeaveChatRoom() {
  const invalidate = useInvalidateRooms();
  const { person } = useCurrentPerson();
  return useMutation({
    mutationFn: (roomId: string) => {
      if (!person) throw new Error("Not ready");
      return leaveChatRoom(roomId, person.id);
    },
    onSuccess: invalidate,
  });
}

// ── Presence (inside the room you're viewing) ─────────────────────────────

export interface RoomPresence {
  id: string;
  name: string;
  avatarUrl: string | null;
  typing: boolean;
}

// Who's in this room right now, and who's typing. One channel per open room.
// NOTE: plain Presence channels aren't covered by RLS — see the migration
// notes; Realtime Authorization should gate these before launch.
export function useRoomPresence(roomId: string | null) {
  const { person } = useCurrentPerson();
  const [present, setPresent] = useState<RoomPresence[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const me = useMemo<RoomPresence | null>(
    () =>
      person
        ? {
            id: person.id,
            name: person.name,
            avatarUrl: person.avatarUrl ?? null,
            typing: false,
          }
        : null,
    [person],
  );

  useEffect(() => {
    if (!roomId || !me) return;
    const channel = supabase.channel(`presence:chat:${roomId}`, {
      config: { presence: { key: me.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, RoomPresence[]>;
        setPresent(
          Object.values(state)
            .map((entries) => entries[0])
            .filter((p): p is RoomPresence => !!p && !!p.id),
        );
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track(me);
      });

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setPresent([]);
    };
  }, [roomId, me]);

  const setTyping = useCallback(
    (typing: boolean) => {
      if (!me) return;
      channelRef.current?.track({ ...me, typing });
    },
    [me],
  );

  return {
    present,
    typing: present.filter((p) => p.typing && p.id !== me?.id),
    setTyping,
  };
}

// Convenience for the rooms list.
export function isRoomActive(room: ChatRoom, now = Date.now()): boolean {
  return (
    room.lastMessageAt != null && now - room.lastMessageAt < ACTIVE_WINDOW_MS
  );
}
