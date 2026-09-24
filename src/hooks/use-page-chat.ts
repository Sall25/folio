import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { openPageChat } from "src/api/chat";
import { useChatRooms } from "./use-chat";

// Opens (creating on first use) a page's discussion room. Only runs when a
// pageId is passed — i.e. when the drawer is actually open — so merely
// viewing a page never creates a room.
export function usePageChat(pageId: string | null) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["chat", "page-room", pageId ?? ""],
    queryFn: async () => {
      const roomId = await openPageChat(pageId!);
      // The rooms list must include the (possibly new) room + membership.
      await qc.invalidateQueries({ queryKey: ["chat", "rooms"] });
      return roomId;
    },
    enabled: !!pageId,
    staleTime: Infinity,
    retry: false,
  });
  return {
    roomId: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}

// The discussion room of a page IF it already exists (no creation) — for
// the toolbar's unread dot.
export function useExistingPageRoom(pageId: string | null) {
  const { all } = useChatRooms();
  return useMemo(
    () =>
      pageId
        ? (all.find((r) => r.kind === "page" && r.pageId === pageId) ?? null)
        : null,
    [all, pageId],
  );
}
