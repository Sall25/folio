import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchRoomBlockRefs,
  sendBlockMessage,
  type BlockRef,
  type SharedBlock,
} from "src/api/chat-blocks";
import type { ChatMessage } from "src/types";
import { chatKeys } from "./use-chat";

const EMPTY = new Map<string, BlockRef>();

// A room's shared blocks. The table isn't in realtime (it has no client
// SELECT policy), so the list refetches whenever the room's message count
// changes — a new block message arrives as a message first.
export function useRoomBlockRefs(roomId: string, messageCount: number) {
  const { data } = useQuery({
    queryKey: ["chat", "block-refs", roomId, messageCount],
    queryFn: () => fetchRoomBlockRefs(roomId),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
  return data ?? EMPTY;
}

export function useSendBlockMessage(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      body: string;
      replyToId: string | null;
      block: SharedBlock;
    }) => sendBlockMessage({ id: crypto.randomUUID(), roomId, ...args }),
    onSuccess: (message) => {
      qc.setQueryData<ChatMessage[]>(chatKeys.messages(roomId), (old) =>
        !old || old.some((m) => m.id === message.id) ? old : [...old, message],
      );
      qc.invalidateQueries({ queryKey: ["chat", "block-refs", roomId] });
    },
  });
}
