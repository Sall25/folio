import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Hash, Lock, MessageSquarePlus, Plus } from "lucide-react";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import {
  isRoomActive,
  useChatPeople,
  useChatRooms,
  useUnreadCounts,
} from "src/hooks/use-chat";
import { useUnreadMentions } from "src/hooks/use-chat-mentions";
import { useCurrentPerson } from "src/hooks/use-session";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { usePages } from "src/hooks/use-pages";
import { useNow } from "src/hooks/use-now";
import { formatRelativeTime } from "src/utils/format-relative";
import type { Page, ChatRoom } from "src/types";
import { PageItemIcon } from "../../page-item-icon";
import { useActivePageActions } from "../../context/active-page-context";
import { otherDmMember, roomTitle, useOpenChatRoom } from "./chat-utils";
import { setPageChatOpen } from "./page-chat-store";
import "../teamspaces-panel/teamspaces-panel.scss";
import "./chats-panel.scss";

interface ChatsPanelProps {
  onDone: () => void;
  onNewRoom: () => void;
  onNewDm: () => void;
}

// Rooms for the current space, your DMs, and the page discussions you're part
// of. Unread counts and an @ badge (unread mentions) on each row.
export function ChatsPanel({ onDone, onNewRoom, onNewDm }: ChatsPanelProps) {
  const { t, i18n } = useTranslation();
  const { person } = useCurrentPerson();
  const { workspaceId } = useCurrentWorkspace();
  const space = useCurrentSpace();
  const teamspaceId = space.kind === "teamspace" ? space.id : null;
  const { rooms, dms, all } = useChatRooms();
  const { data: unread = {} } = useUnreadCounts();
  const { data: mentions = {} } = useUnreadMentions();
  const { data: allPages = [] } = usePages();
  const openRoom = useOpenChatRoom();
  const { setActivePageId } = useActivePageActions();
  const now = useNow();

  const pagesById = useMemo(
    () =>
      new Map<string, Page>(
        (allPages as Page[])
          .filter((p) => p.deletedAt == null)
          .map((p) => [p.id, p]),
      ),
    [allPages],
  );

  // Page discussions you've joined, in this space, that have messages and
  // whose page you can still read — most recent first.
  const pageRooms = useMemo(
    () =>
      all
        .filter(
          (r) =>
            r.kind === "page" &&
            r.pageId != null &&
            pagesById.has(r.pageId) &&
            r.lastMessageAt != null &&
            r.members.some((m) => m.personId === person?.id) &&
            (teamspaceId
              ? r.teamspaceId === teamspaceId
              : r.teamspaceId == null && r.workspaceId === workspaceId),
        )
        .sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0)),
    [all, pagesById, person?.id, teamspaceId, workspaceId],
  );

  const dmPartnerIds = useMemo(
    () =>
      dms
        .map((r) => otherDmMember(r, person?.id))
        .filter((id): id is string => !!id),
    [dms, person?.id],
  );
  const { data: people = [] } = useChatPeople(dmPartnerIds);
  const peopleById = useMemo(
    () => new Map(people.map((p) => [p.id, p])),
    [people],
  );

  const { active, otherRooms, otherDms } = useMemo(() => {
    const activeList = [...rooms, ...dms].filter((r) => isRoomActive(r, now));
    const activeIds = new Set(activeList.map((r) => r.id));
    return {
      active: activeList,
      otherRooms: rooms.filter((r) => !activeIds.has(r.id)),
      otherDms: dms.filter((r) => !activeIds.has(r.id)),
    };
  }, [rooms, dms, now]);

  const open = (room: ChatRoom) => {
    openRoom(room);
    onDone();
  };

  // A page discussion opens on its page, with the drawer.
  const openPageDiscussion = (pageId: string) => {
    setActivePageId(pageId);
    setPageChatOpen(true);
    onDone();
  };

  const badges = (roomId: string) => {
    const count = unread[roomId] ?? 0;
    const mentionCount = mentions[roomId] ?? 0;
    return (
      <>
        {mentionCount > 0 && (
          <span
            className="chat-row__at"
            title={t("chat.mentionedYou", "You were mentioned")}
          >
            @
          </span>
        )}
        {count > 0 && (
          <span className="chat-row__badge">{count > 99 ? "99+" : count}</span>
        )}
      </>
    );
  };

  const renderRow = (room: ChatRoom) => {
    const title = roomTitle(room, peopleById, person?.id, t);
    const isMember = room.members.some((m) => m.personId === person?.id);
    const count = unread[room.id] ?? 0;
    const partner =
      room.kind === "dm"
        ? peopleById.get(otherDmMember(room, person?.id) ?? "")
        : undefined;

    let meta: string;
    if (!isMember) meta = t("chat.notJoined", "Open room · not joined");
    else if (room.lastMessageAt)
      meta = formatRelativeTime(room.lastMessageAt, t, i18n.language);
    else meta = t("chat.noMessages", "No messages yet");

    return (
      <button
        key={room.id}
        type="button"
        className={`tsp-row${count > 0 ? " chat-row--unread" : ""}`}
        onClick={() => open(room)}
      >
        <span className="tsp-row__icon">
          {room.kind === "dm" ? (
            <Avatar
              size="sm"
              src={partner?.avatarUrl ?? undefined}
              name={title}
            />
          ) : room.visibility === "private" ? (
            <Lock size={14} />
          ) : (
            <Hash size={15} />
          )}
        </span>
        <span className="tsp-row__text">
          <span className="tsp-row__name">{title}</span>
          <span className="tsp-row__meta">{meta}</span>
        </span>
        {badges(room.id)}
      </button>
    );
  };

  const renderPageRow = (room: ChatRoom) => {
    const page = pagesById.get(room.pageId!)!;
    const count = unread[room.id] ?? 0;
    return (
      <button
        key={room.id}
        type="button"
        className={`tsp-row${count > 0 ? " chat-row--unread" : ""}`}
        onClick={() => openPageDiscussion(page.id)}
      >
        <span className="tsp-row__icon">
          <PageItemIcon
            cover={page.cover}
            styles={{ width: 15, height: 15, fontSize: 15 }}
          />
        </span>
        <span className="tsp-row__text">
          <span className="tsp-row__name">
            {page.title || t("page.untitled")}
          </span>
          <span className="tsp-row__meta">
            {formatRelativeTime(room.lastMessageAt!, t, i18n.language)}
          </span>
        </span>
        {badges(room.id)}
      </button>
    );
  };

  const empty =
    rooms.length === 0 && dms.length === 0 && pageRooms.length === 0;

  return (
    <div className="tsp">
      <div className="tsp__header">
        <span className="tsp__title">{t("chat.title", "Chats")}</span>
      </div>

      <div className="tsp__body">
        {active.length > 0 && (
          <>
            <div className="tsp__label chat-label--live">
              <span className="chat-live-dot" aria-hidden="true" />
              {t("chat.activeNow", "Active now")}
            </div>
            {active.map(renderRow)}
          </>
        )}

        {otherRooms.length > 0 && (
          <>
            <div className="tsp__label">{t("chat.rooms", "Rooms")}</div>
            {otherRooms.map(renderRow)}
          </>
        )}

        {otherDms.length > 0 && (
          <>
            <div className="tsp__label">
              {t("chat.directMessages", "Direct messages")}
            </div>
            {otherDms.map(renderRow)}
          </>
        )}

        {pageRooms.length > 0 && (
          <>
            <div className="tsp__label">
              {t("chat.pageDiscussions", "Page discussions")}
            </div>
            {pageRooms.map(renderPageRow)}
          </>
        )}

        {empty && (
          <div className="tsp__empty">
            <MessageSquarePlus size={24} strokeWidth={1.5} />
            <p>
              {t(
                "chat.empty",
                "No conversations yet. Start a room or message someone.",
              )}
            </p>
          </div>
        )}
      </div>

      <div className="tsp__footer chat-panel__footer">
        <button type="button" className="tsp__create" onClick={onNewRoom}>
          <Plus size={15} />
          <span>{t("chat.newRoom", "New room")}</span>
        </button>
        <button type="button" className="tsp__create" onClick={onNewDm}>
          <MessageSquarePlus size={15} />
          <span>{t("chat.newMessage", "New message")}</span>
        </button>
      </div>
    </div>
  );
}
