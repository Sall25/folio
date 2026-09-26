import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteChatRoom } from "src/api/chat-delete";
import { removeChatFile } from "src/api/chat-attachments";
import { chatKeys } from "./use-chat";

// Delete a room you own. Its files are removed from Storage FIRST, while
// you're still a member (the bucket's policies check membership); a file
// that fails to delete doesn't block the room deletion.
export function useDeleteChatRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { roomId: string; filePaths: string[] }) => {
      await Promise.allSettled(args.filePaths.map((p) => removeChatFile(p)));
      await deleteChatRoom(args.roomId);
    },
    onSuccess: (_data, { roomId }) => {
      qc.removeQueries({ queryKey: chatKeys.messages(roomId) });
      qc.removeQueries({ queryKey: ["chat", "showcase-page", roomId] });
      qc.removeQueries({ queryKey: ["chat", "row-refs", roomId] });
      qc.invalidateQueries({ queryKey: ["chat", "rooms"] });
      qc.invalidateQueries({ queryKey: chatKeys.unread() });
    },
  });
}
