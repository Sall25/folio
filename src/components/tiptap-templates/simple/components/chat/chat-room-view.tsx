import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "@tanstack/react-location";
import { ArrowUp, Hash, Lock, LogOut, Trash2, UserPlus } from "lucide-react";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  useChatMessages,
  useChatPeople,
  useChatRoom,
  useDeleteMessage,
  useJoinChatRoom,
  useLeaveChatRoom,
  useMarkRoomRead,
  useRoomPresence,
  useSendMessage,
} from "src/hooks/use-chat";
import { useCurrentPerson } from "src/hooks/use-session";
import { spaceHomePath, useCurrentSpace } from "src/hooks/use-current-space";
import { useIsMobile } from "src/hooks/use-breakpoint";
import { useEditorLayout } from "../../context/editor-layout-context";
import type { ChatMessage, ChatPerson, ChatRoom } from "src/types";
import { chatRoomIdFromPath, otherDmMember, roomTitle } from "./chat-utils";
import { InviteToRoomModal } from "./chat-modals";
import "./chat-room.scss";

const GROUP_WINDOW_MS = 5 * 60 * 1000;

export function ChatRoomView() {
  const { t } = useTranslation();
  const location = useLocation();
  const roomId = chatRoomIdFromPath(location.current.pathname);
  const { room, isLoading } = useChatRoom(roomId);
  const { collapsed, expandedWidth } = useEditorLayout();
  const isMobile = useIsMobile();

  return (
    <div
      className="chat-view"
      style={{ paddingLeft: isMobile || collapsed ? 0 : expandedWidth }}
    >
      {room ? (
        // Keyed so scroll/draft/typing state resets per room.
        <RoomContent key={room.id} room={room} />
      ) : (
        <div className="chat-view__state">
          {isLoading
            ? t("chat.loading", "Loading…")
            : t(
                "chat.notFound",
                "This conversation doesn't exist or you don't have access to it.",
              )}
        </div>
      )}
    </div>
  );
}

type Item =
  | { kind: "day"; key: string; label: string }
  | { kind: "msg"; key: string; msg: ChatMessage; compact: boolean };

function RoomContent({ room }: { room: ChatRoom }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const space = useCurrentSpace();
  const { person } = useCurrentPerson();
  const meId = person?.id;

  const isMember = room.members.some((m) => m.personId === meId);
  const { data: messages = [] } = useChatMessages(room.id);
  useMarkRoomRead(isMember ? room.id : null, messages.length);
  const { present, typing, setTyping } = useRoomPresence(
    isMember ? room.id : null,
  );

  const personIds = useMemo(
    () => [
      ...room.members.map((m) => m.personId),
      ...messages.map((m) => m.authorId).filter((id): id is string => !!id),
    ],
    [room.members, messages],
  );
  const { data: people = [] } = useChatPeople(personIds);
  const peopleById = useMemo(
    () => new Map<string, ChatPerson>(people.map((p) => [p.id, p])),
    [people],
  );

  const send = useSendMessage(room.id);
  const del = useDeleteMessage(room.id);
  const join = useJoinChatRoom();
  const leave = useLeaveChatRoom();
  const [inviteOpen, setInviteOpen] = useState(false);

  const title = roomTitle(room, peopleById, meId, t);
  const partner =
    room.kind === "dm"
      ? peopleById.get(otherDmMember(room, meId) ?? "")
      : undefined;

  // ── Timeline items: day separators + author grouping ───────────────────
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    let lastDay = "";
    let prev: ChatMessage | null = null;
    for (const msg of messages) {
      const d = new Date(msg.createdAt);
      const day = d.toDateString();
      if (day !== lastDay) {
        out.push({
          kind: "day",
          key: `day-${day}`,
          label: d.toLocaleDateString(i18n.language, {
            weekday: "long",
            month: "long",
            day: "numeric",
          }),
        });
        lastDay = day;
        prev = null;
      }
      const compact =
        !!prev &&
        prev.authorId === msg.authorId &&
        msg.createdAt - prev.createdAt < GROUP_WINDOW_MS;
      out.push({ kind: "msg", key: msg.id, msg, compact });
      prev = msg;
    }
    return out;
  }, [messages, i18n.language]);

  // ── Stick to bottom unless the user scrolled up ────────────────────────
  const listRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [items.length]);

  const teamspaceId = space.kind === "teamspace" ? space.id : null;

  const onSend = (body: string) => {
    stick.current = true;
    send.mutate({ body });
  };

  const onLeave = () => {
    leave.mutate(room.id, {
      onSuccess: () => navigate({ to: spaceHomePath(teamspaceId) }),
    });
  };

  const typingNames = typing.map((p) => p.name.split(" ")[0]).filter(Boolean);

  return (
    <div className="chat-room">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="chat-room__header">
        <span className="chat-room__icon">
          {room.kind === "dm" ? (
            <Avatar src={partner?.avatarUrl ?? undefined} name={title} />
          ) : room.visibility === "private" ? (
            <Lock size={16} />
          ) : (
            <Hash size={17} />
          )}
        </span>
        <div className="chat-room__heading">
          <h1 className="chat-room__title">{title}</h1>
          <span className="chat-room__meta">
            {room.kind === "dm"
              ? t("chat.directMessage", "Direct message")
              : t("chat.memberCount", {
                  count: room.members.length,
                  defaultValue: "{{count}} members",
                })}
          </span>
        </div>

        {present.length > 0 && (
          <div
            className="chat-room__present"
            title={present.map((p) => p.name).join(", ")}
          >
            {present.slice(0, 5).map((p) => (
              <span key={p.id} className="chat-room__present-avatar">
                <Avatar
                  size="sm"
                  src={p.avatarUrl ?? undefined}
                  name={p.name}
                  online
                />
              </span>
            ))}
            {present.length > 5 && (
              <span className="chat-room__present-more">
                +{present.length - 5}
              </span>
            )}
          </div>
        )}

        {room.kind === "room" && isMember && (
          <div className="chat-room__actions">
            <Button
              variant="ghost"
              tooltip={t("chat.invite", "Invite")}
              onClick={() => setInviteOpen(true)}
            >
              <UserPlus className="tiptap-button-icon" />
            </Button>
            <Button
              variant="ghost"
              tooltip={t("chat.leave", "Leave room")}
              onClick={onLeave}
            >
              <LogOut className="tiptap-button-icon" />
            </Button>
          </div>
        )}
      </header>

      {/* ── Messages ───────────────────────────────────────────────── */}
      <div className="chat-room__list" ref={listRef} onScroll={onScroll}>
        {items.length === 0 ? (
          <div className="chat-room__empty">
            <span className="chat-room__empty-icon">
              {room.kind === "dm" ? (
                <Avatar src={partner?.avatarUrl ?? undefined} name={title} />
              ) : (
                <Hash size={22} />
              )}
            </span>
            <p className="chat-room__empty-title">
              {room.kind === "dm"
                ? t("chat.dmStart", {
                    name: title,
                    defaultValue:
                      "This is the start of your conversation with {{name}}.",
                  })
                : t("chat.roomStart", {
                    name: title,
                    defaultValue: "This is the start of #{{name}}.",
                  })}
            </p>
          </div>
        ) : (
          items.map((item) =>
            item.kind === "day" ? (
              <div key={item.key} className="chat-day">
                <span>{item.label}</span>
              </div>
            ) : (
              <MessageRow
                key={item.key}
                msg={item.msg}
                compact={item.compact}
                author={
                  item.msg.authorId
                    ? peopleById.get(item.msg.authorId)
                    : undefined
                }
                isMine={item.msg.authorId === meId}
                onDelete={() => del.mutate(item.msg.id)}
              />
            ),
          )
        )}
      </div>

      {/* ── Composer / join bar ────────────────────────────────────── */}
      <div className="chat-room__bottom">
        <div className="chat-room__typing" aria-live="polite">
          {typingNames.length === 1 &&
            t("chat.typingOne", {
              name: typingNames[0],
              defaultValue: "{{name}} is typing…",
            })}
          {typingNames.length > 1 &&
            t("chat.typingMany", "Several people are typing…")}
        </div>

        {isMember ? (
          <Composer
            placeholder={
              room.kind === "dm"
                ? t("chat.messageTo", {
                    name: title,
                    defaultValue: "Message {{name}}",
                  })
                : t("chat.messageRoom", {
                    name: title,
                    defaultValue: "Message #{{name}}",
                  })
            }
            onSend={onSend}
            onTyping={setTyping}
          />
        ) : (
          <div className="chat-join">
            <span>{t("chat.viewingOpen", "You're viewing an open room.")}</span>
            <Button
              variant="primary"
              disabled={join.isPending}
              onClick={() => join.mutate(room.id)}
            >
              <span className="tiptap-button-text">
                {t("chat.join", "Join room")}
              </span>
            </Button>
          </div>
        )}
      </div>

      {inviteOpen && (
        <InviteToRoomModal room={room} onClose={() => setInviteOpen(false)} />
      )}
    </div>
  );
}

function MessageRow({
  msg,
  compact,
  author,
  isMine,
  onDelete,
}: {
  msg: ChatMessage;
  compact: boolean;
  author: ChatPerson | undefined;
  isMine: boolean;
  onDelete: () => void;
}) {
  const { t, i18n } = useTranslation();
  const time = new Date(msg.createdAt).toLocaleTimeString(i18n.language, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const pending = msg.id.startsWith("pending-");
  const deleted = msg.deletedAt != null;
  const name = author?.name ?? t("chat.unknown", "Someone");

  return (
    <div
      className={[
        "chat-msg",
        compact && "chat-msg--compact",
        pending && "is-pending",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="chat-msg__gutter">
        {compact ? (
          <span className="chat-msg__hover-time">{time}</span>
        ) : (
          <Avatar src={author?.avatarUrl ?? undefined} name={name} />
        )}
      </div>
      <div className="chat-msg__main">
        {!compact && (
          <div className="chat-msg__head">
            <span className="chat-msg__author">{name}</span>
            <span className="chat-msg__time">{time}</span>
          </div>
        )}
        {deleted ? (
          <p className="chat-msg__body chat-msg__body--deleted">
            {t("chat.deleted", "Message deleted")}
          </p>
        ) : (
          <p className="chat-msg__body">{msg.body}</p>
        )}
      </div>
      {isMine && !deleted && !pending && (
        <button
          type="button"
          className="chat-msg__action"
          aria-label={t("chat.deleteMessage", "Delete message")}
          title={t("chat.deleteMessage", "Delete message")}
          onClick={onDelete}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

function Composer({
  placeholder,
  onSend,
  onTyping,
}: {
  placeholder: string;
  onSend: (body: string) => void;
  onTyping: (typing: boolean) => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  useEffect(() => {
    ref.current?.focus();
    return () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      onTyping(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bumpTyping = () => {
    onTyping(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => onTyping(false), 3000);
  };

  const submit = () => {
    const body = value.trim();
    if (!body) return;
    onSend(body);
    setValue("");
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    onTyping(false);
  };

  return (
    <div className="chat-composer">
      <textarea
        ref={ref}
        className="chat-composer__input"
        rows={1}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          if (e.target.value) bumpTyping();
        }}
        onBlur={() => onTyping(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button
        type="button"
        className="chat-composer__send"
        aria-label={t("chat.send", "Send")}
        disabled={!value.trim()}
        onClick={submit}
      >
        <ArrowUp size={16} />
      </button>
    </div>
  );
}
