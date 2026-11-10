import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-location";
import { useTranslation } from "react-i18next";
import type { Notification, Page } from "src/types";
import { useNotificationActions } from "src/features/inbox/notification/notification-context";
import { useActivePageActions } from "src/features/pages/context/active-page-context";
import { useToast } from "src/features/shell/toast";
import { usePagesBase } from "src/hooks/use-pages";
import { useChatRooms } from "src/hooks/use-chat";
import { useSwitchWorkspace } from "src/hooks/use-workspace-switch";
import { spacePagePath } from "src/hooks/use-current-space";
import { fetchNotificationTargetWorkspace } from "src/api/notifications";
import { chatPath, useOpenChatRoom } from "../../chat/chat-utils";
import { setPendingScrollTarget } from "./pending-scroll-target";
import { useRowLinks } from "src/features/database/hooks/use-row-links";

const allPagesLens = (pages: Page[]) => pages;

// Opening a notification — one handler for the inbox and the bell, so both
// land in the same place:
//   • a page here → open it and scroll to the mention / comment;
//   • a page in the trash → say so instead of opening it;
//   • a chat mention → the room, scrolled to the message;
//   • something in another workspace you own → switch there, then open it;
//   • anything else (no access any more, deleted) → say it's unavailable.
// `onDone` runs once navigation starts (close a popover or mobile drawer).
export function useOpenNotification(onDone?: () => void) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { show } = useToast();
  const { markRead } = useNotificationActions();
  const { setActivePageId } = useActivePageActions();
  const { data: pages } = usePagesBase(allPagesLens);
  const { all: rooms } = useChatRooms();
  const openRoom = useOpenChatRoom();
  const switchWorkspace = useSwitchWorkspace();
  const { openRow } = useRowLinks();

  return useCallback(
    async (n: Notification) => {
      markRead(n.id);

      // "Have a look at this row": open it where it lives — its database,
      // the row in the peek. (Not loaded here → the page route below.)
      if ((n.type === "row-look" || n.type === "row-assign") && n.mentionId) {
        const row = pages?.find((p) => p.id === n.mentionId);
        if (row && row.deletedAt == null) {
          openRow(row.id);
          onDone?.();
          return;
        }
      }

      const pageId = n.sourcePageId != null ? String(n.sourcePageId) : null;
      const roomId = !pageId && n.sourceRoomId ? n.sourceRoomId : null;

      // Where to scroll once the page / room is on screen.
      const target = () => {
        if (pageId) {
          setPendingScrollTarget({
            pageId,
            targetNodeId: n.targetNodeId,
            type: n.type,
          });
        } else if (roomId && n.targetNodeId) {
          setPendingScrollTarget({
            pageId: roomId,
            targetNodeId: n.targetNodeId,
            type: "chat-message",
          });
        }
      };

      // 1. Reachable in this workspace.
      if (pageId) {
        const page = pages?.find((p) => p.id === pageId);
        if (page) {
          if (page.deletedAt != null) {
            show(t("inbox.pageInTrash"), "info");
            return;
          }
          target();
          setActivePageId(pageId);
          onDone?.();
          return;
        }
      } else if (roomId) {
        const room = rooms.find((r) => r.id === roomId);
        if (room) {
          target();
          openRoom(room);
          onDone?.();
          return;
        }
      } else {
        return; // nothing to open
      }

      // 2. In another workspace — switch there if it's one of yours.
      let workspaceId: string | null = null;
      try {
        workspaceId = await fetchNotificationTargetWorkspace(pageId, roomId);
      } catch {
        workspaceId = null;
      }
      if (!workspaceId) {
        show(t("inbox.unavailable"), "info");
        return;
      }

      try {
        await switchWorkspace.mutateAsync(workspaceId);
      } catch {
        show(t("inbox.switchFailed"), "error");
        return;
      }
      target();
      if (pageId) {
        navigate({ to: spacePagePath(null, pageId) });
      } else if (roomId) {
        const room = rooms.find((r) => r.id === roomId);
        navigate({
          to: chatPath(
            room?.kind === "room" ? (room.teamspaceId ?? null) : null,
            roomId,
          ),
        });
      }
      onDone?.();
    },
    [
      markRead,
      pages,
      rooms,
      show,
      t,
      setActivePageId,
      openRoom,
      switchWorkspace,
      navigate,
      openRow,
      onDone,
    ],
  );
}
