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
import { useCurrentPerson } from "src/hooks/use-session";
import { useNow } from "src/hooks/use-now";
import { formatRelativeTime } from "src/utils/format-relative";
import type { ChatRoom } from "src/types";
import { otherDmMember, roomTitle, useOpenChatRoom } from "./chat-utils";
import "../teamspaces-panel/teamspaces-panel.scss";
import "./chats-panel.scss";

interface ChatsPanelProps {
  onDone: () => void;
  onNewRoom: () => void;
  onNewDm: () => void;
}

// Rooms for the current space and your DMs, grouped: Active now (a message in
// the last 10 min), Rooms, Direct messages. Unread counts on each row.
export function ChatsPanel({ onDone, onNewRoom, onNewDm }: ChatsPanelProps) {
  const { t, i18n } = useTranslation();
  const { person } = useCurrentPerson();
  const { rooms, dms } = useChatRooms();
  const { data: unread = {} } = useUnreadCounts();
  const openRoom = useOpenChatRoom();
  // Shared clock: pure during render, refreshes every 30s so "Active now"
  // updates while the panel is open.
  const now = useNow();

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
        {count > 0 && (
          <span className="chat-row__badge">{count > 99 ? "99+" : count}</span>
        )}
      </button>
    );
  };

  const empty = rooms.length === 0 && dms.length === 0;

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
