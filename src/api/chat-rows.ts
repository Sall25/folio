import { supabase } from "src/api/supabase-client";

// A row posted into a showcase room. pageId is null when the viewer can't
// read the row (→ a locked card), like BlockRef's null snapshot.
export interface RowRef {
  pageId: string | null;
}

export async function fetchRoomRowRefs(
  roomId: string,
): Promise<Map<string, RowRef>> {
  const { data, error } = await supabase.rpc("room_row_refs", {
    p_room: roomId,
  });
  if (error) throw error;
  const map = new Map<string, RowRef>();
  for (const row of (data ?? []) as {
    message_id: string;
    page_id: string | null;
  }[]) {
    map.set(row.message_id, { pageId: row.page_id });
  }
  return map;
}

// The database page a room showcases, or null for an ordinary room. Read
// separately so ChatRoom / fetchChatRooms stay untouched.
export async function fetchRoomShowcasePage(
  roomId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("chat_rooms")
    .select("showcase_page_id")
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw error;
  return (data?.showcase_page_id as string | null | undefined) ?? null;
}

export async function setRoomShowcase(
  roomId: string,
  pageId: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("set_room_showcase", {
    p_room: roomId,
    p_page: pageId,
  });
  if (error) throw error;
}
