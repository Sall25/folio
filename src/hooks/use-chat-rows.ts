import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchRoomRowRefs,
  fetchRoomShowcasePage,
  type RowRef,
} from "src/api/chat-rows";

const EMPTY = new Map<string, RowRef>();

export const showcaseKeys = {
  page: (roomId: string) => ["chat", "showcase-page", roomId] as const,
  rowRefs: (roomId: string) => ["chat", "row-refs", roomId] as const,
};

// The database page this room showcases (null → ordinary room).
export function useRoomShowcasePage(roomId: string | null) {
  return useQuery({
    queryKey: showcaseKeys.page(roomId ?? ""),
    queryFn: () => fetchRoomShowcasePage(roomId!),
    enabled: !!roomId,
    staleTime: 5 * 60_000,
  });
}

// A room's row messages. Like block refs, the table isn't in realtime, so the
// list refetches whenever the room's message count changes — a new row
// arrives as a message first (posted by the server trigger).
export function useRoomRowRefs(roomId: string | null, messageCount: number) {
  const { data } = useQuery({
    queryKey: [...showcaseKeys.rowRefs(roomId ?? ""), messageCount],
    queryFn: () => fetchRoomRowRefs(roomId!),
    enabled: !!roomId,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
  return data ?? EMPTY;
}
