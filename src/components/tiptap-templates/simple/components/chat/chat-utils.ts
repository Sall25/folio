import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-location";
import type { TFunction } from "i18next";
import type { ChatPerson, ChatRoom } from "src/types";
import { useCurrentSpace } from "src/hooks/use-current-space";

const CHAT_PATH = /\/chat\/([^/]+)/;

export function chatRoomIdFromPath(pathname: string): string | null {
  const m = pathname.match(CHAT_PATH);
  return m ? m[1] : null;
}

export function chatPath(teamspaceId: string | null, roomId: string): string {
  return teamspaceId ? `/t/${teamspaceId}/chat/${roomId}` : `/chat/${roomId}`;
}

export function otherDmMember(room: ChatRoom, meId: string | undefined) {
  return room.members.find((m) => m.personId !== meId)?.personId ?? null;
}

export function roomTitle(
  room: ChatRoom,
  peopleById: Map<string, ChatPerson>,
  meId: string | undefined,
  t: TFunction,
): string {
  if (room.kind === "dm") {
    const other = otherDmMember(room, meId);
    return (
      (other && peopleById.get(other)?.name) ||
      t("chat.directMessage", "Direct message")
    );
  }
  return room.name || t("chat.untitledRoom", "Untitled room");
}

// Open a room in the right space: a teamspace room under its teamspace, a
// workspace room at /chat, a DM in whatever space you're in now.
export function useOpenChatRoom() {
  const navigate = useNavigate();
  const space = useCurrentSpace();
  const currentTeamspace = space.kind === "teamspace" ? space.id : null;

  return useCallback(
    (room: Pick<ChatRoom, "id" | "kind" | "teamspaceId">) => {
      const ts = room.kind === "room" ? room.teamspaceId : currentTeamspace;
      navigate({ to: chatPath(ts, room.id) });
    },
    [navigate, currentTeamspace],
  );
}
