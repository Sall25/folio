import { supabase } from "./supabase-client";

export interface ChatReaction {
  roomId: string;
  messageId: string;
  personId: string;
  emoji: string;
}

export interface ReactionRow {
  room_id: string;
  message_id: string;
  person_id: string;
  emoji: string;
}

export const toReaction = (r: ReactionRow): ChatReaction => ({
  roomId: r.room_id,
  messageId: r.message_id,
  personId: r.person_id,
  emoji: r.emoji,
});

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function fetchRoomReactions(
  roomId: string,
): Promise<ChatReaction[]> {
  const { data, error } = await supabase
    .from("chat_reactions")
    .select("room_id, message_id, person_id, emoji")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  fail(error);
  return ((data ?? []) as ReactionRow[]).map(toReaction);
}

export async function addReaction(r: ChatReaction): Promise<void> {
  const { error } = await supabase.from("chat_reactions").insert({
    room_id: r.roomId,
    message_id: r.messageId,
    person_id: r.personId,
    emoji: r.emoji,
  });
  fail(error);
}

export async function removeReaction(r: ChatReaction): Promise<void> {
  const { error } = await supabase
    .from("chat_reactions")
    .delete()
    .eq("message_id", r.messageId)
    .eq("person_id", r.personId)
    .eq("emoji", r.emoji);
  fail(error);
}