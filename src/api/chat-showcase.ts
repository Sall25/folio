import { supabase } from "src/api/supabase-client";
import type { ShowcaseKeys } from "src/utils/make-showcase-source";

// The showcase side of a room: which database it shows and the property
// handles. Kept out of ChatRoom/fetchChatRooms so the chat API is untouched.
export interface RoomShowcase {
  sourceId: string;
  keys: ShowcaseKeys;
}

export async function fetchRoomShowcase(
  roomId: string,
): Promise<RoomShowcase | null> {
  const { data, error } = await supabase
    .from("chat_rooms")
    .select("layout, source_id, showcase_keys")
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.layout !== "showcase" || !data.source_id) return null;
  return {
    sourceId: data.source_id as string,
    keys: data.showcase_keys as ShowcaseKeys,
  };
}

export async function setRoomShowcase(
  roomId: string,
  sourceId: string,
  keys: ShowcaseKeys,
): Promise<void> {
  const { error } = await supabase.rpc("set_room_showcase", {
    p_room: roomId,
    p_source: sourceId,
    p_keys: keys,
  });
  if (error) throw error;
}
