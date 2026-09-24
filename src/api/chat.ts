import { supabase } from "./supabase-client";
import type {
  ChatRoomKind,
  ChatVisibility,
  ChatRoom,
  ChatMessage,
  ChatPerson,
} from "src/types";

// ── Row mapping ───────────────────────────────────────────────────────────
interface MemberRow {
  person_id: string;
  role: "owner" | "member";
  last_read_at: number;
}

interface RoomRow {
  id: string;
  kind: ChatRoomKind;
  name: string | null;
  icon: string | null;
  workspace_id: string | null;
  teamspace_id: string | null;
  page_id: string | null;
  visibility: ChatVisibility;
  created_by: string | null;
  created_at: number;
  last_message_at: number | null;
  chat_members?: MemberRow[];
}

export interface MessageRow {
  id: string;
  room_id: string;
  author_id: string | null;
  body: string;
  reply_to_id: string | null;
  created_at: number;
  edited_at: number | null;
  deleted_at: number | null;
}

const toRoom = (r: RoomRow): ChatRoom => ({
  id: r.id,
  kind: r.kind,
  name: r.name,
  icon: r.icon,
  workspaceId: r.workspace_id,
  teamspaceId: r.teamspace_id,
  pageId: r.page_id ?? null,
  visibility: r.visibility,
  createdBy: r.created_by,
  createdAt: r.created_at,
  lastMessageAt: r.last_message_at,
  members: (r.chat_members ?? []).map((m) => ({
    personId: m.person_id,
    role: m.role,
    lastReadAt: m.last_read_at,
  })),
});

export const toMessage = (m: MessageRow): ChatMessage => ({
  id: m.id,
  roomId: m.room_id,
  authorId: m.author_id,
  body: m.body,
  replyToId: m.reply_to_id,
  createdAt: m.created_at,
  editedAt: m.edited_at,
  deletedAt: m.deleted_at,
});

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

// ── Reads ─────────────────────────────────────────────────────────────────

// Every room RLS lets you see, with its members. Scoping to the current
// space (and splitting rooms / DMs / page discussions) happens in the hooks.
export async function fetchChatRooms(): Promise<ChatRoom[]> {
  const { data, error } = await supabase
    .from("chat_rooms")
    .select(
      "id, kind, name, icon, workspace_id, teamspace_id, page_id, visibility, created_by, created_at, last_message_at, chat_members(person_id, role, last_read_at)",
    )
    .order("last_message_at", { ascending: false, nullsFirst: false });
  fail(error);
  return ((data ?? []) as RoomRow[]).map(toRoom);
}

export async function fetchChatMessages(
  roomId: string,
  limit = 100,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit);
  fail(error);
  return ((data ?? []) as MessageRow[]).map(toMessage).reverse();
}

export async function fetchChatPeople(ids: string[]): Promise<ChatPerson[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("people")
    .select("id, name, avatar_url")
    .in("id", ids);
  fail(error);
  return (
    (data ?? []) as { id: string; name: string; avatar_url: string | null }[]
  ).map((p) => ({ id: p.id, name: p.name, avatarUrl: p.avatar_url }));
}

export async function fetchUnreadCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc("chat_unread_counts");
  fail(error);
  const out: Record<string, number> = {};
  for (const row of (data ?? []) as { room_id: string; unread: number }[]) {
    out[row.room_id] = row.unread;
  }
  return out;
}

// ── Writes ────────────────────────────────────────────────────────────────

export async function sendChatMessage(msg: {
  id: string;
  roomId: string;
  authorId: string;
  body: string;
  replyToId?: string | null;
}): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      id: msg.id,
      room_id: msg.roomId,
      author_id: msg.authorId,
      body: msg.body,
      reply_to_id: msg.replyToId ?? null,
    })
    .select()
    .single();
  fail(error);
  return toMessage(data as MessageRow);
}

export async function deleteChatMessage(id: string): Promise<void> {
  const { error } = await supabase
    .from("chat_messages")
    .update({ deleted_at: Date.now() })
    .eq("id", id);
  fail(error);
}

export async function createChatRoom(args: {
  name: string;
  icon?: string | null;
  teamspaceId?: string | null;
  visibility: ChatVisibility;
  memberIds: string[];
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_chat_room", {
    p_name: args.name,
    p_icon: args.icon ?? null,
    p_teamspace_id: args.teamspaceId ?? null,
    p_visibility: args.visibility,
    p_member_ids: args.memberIds,
  });
  fail(error);
  return data as string;
}

export async function addChatMembers(
  roomId: string,
  memberIds: string[],
): Promise<number> {
  const { data, error } = await supabase.rpc("add_chat_members", {
    p_room: roomId,
    p_member_ids: memberIds,
  });
  fail(error);
  return data as number;
}

export async function joinChatRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc("join_chat_room", { p_room: roomId });
  fail(error);
}

export async function leaveChatRoom(
  roomId: string,
  personId: string,
): Promise<void> {
  const { error } = await supabase
    .from("chat_members")
    .delete()
    .eq("room_id", roomId)
    .eq("person_id", personId);
  fail(error);
}

export async function openDm(otherPersonId: string): Promise<string> {
  const { data, error } = await supabase.rpc("open_dm", {
    p_other: otherPersonId,
  });
  fail(error);
  return data as string;
}

// Open (lazily creating) a page's discussion; joins you if you can comment.
export async function openPageChat(pageId: string): Promise<string> {
  const { data, error } = await supabase.rpc("open_page_chat", {
    p_page: pageId,
  });
  fail(error);
  return data as string;
}

export async function markChatRead(roomId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_chat_read", { p_room: roomId });
  fail(error);
}
