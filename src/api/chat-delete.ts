import { supabase } from "src/api/supabase-client";

export async function deleteChatRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_chat_room", { p_room: roomId });
  if (error) throw error;
}
