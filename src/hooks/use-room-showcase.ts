import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRoomShowcase, setRoomShowcase } from "src/api/chat-showcase";
import { useCreateChatRoom } from "src/hooks/use-chat";
import { useCreateShowcaseSource } from "src/hooks/use-create-showcase-source";
import { useCurrentSpace } from "src/hooks/use-current-space";

export const showcaseKeys = {
  room: (roomId: string) => ["chat", "showcase", roomId] as const,
};

// null → an ordinary chat room.
export function useRoomShowcase(roomId: string | null) {
  return useQuery({
    queryKey: showcaseKeys.room(roomId ?? ""),
    queryFn: () => fetchRoomShowcase(roomId!),
    enabled: !!roomId,
    staleTime: 5 * 60_000,
  });
}

// Create room → create its database → link them. A failure after the room
// exists leaves a normal chat room, never a half-linked showcase.
export function useCreateShowcaseRoom() {
  const qc = useQueryClient();
  const space = useCurrentSpace();
  const createRoom = useCreateChatRoom();
  const createSource = useCreateShowcaseSource();

  return useMutation({
    mutationFn: async (args: { name: string; memberIds: string[] }) => {
      const roomId = await createRoom.mutateAsync({
        name: args.name,
        visibility: "open",
        memberIds: args.memberIds,
      });
      const created = await createSource({
        name: args.name,
        teamspaceId: space.kind === "teamspace" ? space.id : null,
      });
      if (!created) throw new Error("Not ready");
      await setRoomShowcase(roomId, created.sourceId, created.keys);
      qc.setQueryData(showcaseKeys.room(roomId), {
        sourceId: created.sourceId,
        keys: created.keys,
      });
      return roomId;
    },
  });
}
