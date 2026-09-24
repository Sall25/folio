import { supabase } from "./supabase-client";

// Unread messages mentioning the current user, per room.
export async function fetchUnreadMentions(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc("chat_unread_mentions");
  if (error) throw new Error(error.message);
  const out: Record<string, number> = {};
  for (const row of (data ?? []) as { room_id: string; mentions: number }[]) {
    out[row.room_id] = row.mentions;
  }
  return out;
}
