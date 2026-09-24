import { supabase } from "./supabase-client";
import type { ChatMessage } from "src/types";
import { toMessage, type MessageRow } from "./chat";

// The page of messages just before `beforeCreatedAt`, returned oldest-first.
export async function fetchChatMessagesBefore(
  roomId: string,
  beforeCreatedAt: number,
  limit: number,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("room_id", roomId)
    .lt("created_at", beforeCreatedAt)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as MessageRow[]).map(toMessage).reverse();
}
