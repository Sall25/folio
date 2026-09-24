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
import { useChatCandidates } from "src/hooks/use-chat-candidates";
import { usePages } from "src/hooks/use-pages";
import { useCurrentPerson } from "src/hooks/use-session";
import { spaceHomePath, useCurrentSpace } from "src/hooks/use-current-space";
import { useIsMobile } from "src/hooks/use-breakpoint";
import { useEditorLayout } from "../../context/editor-layout-context";
import { useActivePageActions } from "../../context/active-page-context";
import { PageItemIcon } from "../../page-item-icon";
import type { ChatMessage, ChatPerson, ChatRoom } from "src/types";
import type { Page } from "src/types";
import {
  mentionedPersonIds,
  mentionsPerson,
  pageToken,
  parseBody,
  personToken,
  serializeDraft,
  type DraftMention,
} from "src/lib/chat-mentions";
import { chatRoomIdFromPath, otherDmMember, roomTitle } from "./chat-utils";
import { InviteToRoomModal } from "./chat-modals";
import { MentionPicker, type MentionItem } from "./mention-picker";
import "./chat-room.scss";
import "./mention-picker.scss";

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const PICKER_LIMIT = 5;

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

  // Everyone we need a name for: members, authors, and people mentioned.
  const personIds = useMemo(() => {
    const ids = new Set<string>(room.members.map((m) => m.personId));
    for (const msg of messages) {
      if (msg.authorId) ids.add(msg.authorId);
      for (const id of mentionedPersonIds(msg.body)) ids.add(id);
    }
    return [...ids];
  }, [room.members, messages]);
  const { data: people = [] } = useChatPeople(personIds);
  const peopleById = useMemo(
    () => new Map<string, ChatPerson>(people.map((p) => [p.id, p])),
    [people],
  );

  // Pages you can read — for page chips and the @ picker.
  const { data: allPages = [] } = usePages();
  const pagesById = useMemo(
    () =>
      new Map<string, Page>(
        (allPages as Page[])
          .filter((p) => p.deletedAt == null)
          .map((p) => [p.id, p]),
      ),
    [allPages],
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

  // People you can mention: the room's members, plus — in an open room —
  // everyone in its scope (they can see the room, so they'll get notified).
  const { candidates: scopePeople } = useChatCandidates("room");
  const mentionablePeople = useMemo(() => {
    const byId = new Map<string, ChatPerson>();
    for (const m of room.members) {
      const p = peopleById.get(m.personId);
      if (p) byId.set(p.id, p);
    }
    if (room.kind === "room" && room.visibility === "open") {
      for (const p of scopePeople) byId.set(p.id, p);
    }
    if (meId) byId.delete(meId);
    return [...byId.values()];
  }, [room, peopleById, scopePeople, meId]);

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
                meId={meId}
                peopleById={peopleById}
                pagesById={pagesById}
                onDelete={() => del.mutate(item.msg.id)}
              />
            ),
          )
        )}
      </div>

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
            people={mentionablePeople}
            pages={[...pagesById.values()]}
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

// Renders a body with mention tokens resolved: people as @Name (highlighted
// when it's you), pages as clickable chips — or a locked chip when the page
// isn't one you can read.
function MessageBody({
  body,
  meId,
  peopleById,
  pagesById,
}: {
  body: string;
  meId: string | undefined;
  peopleById: Map<string, ChatPerson>;
  pagesById: Map<string, Page>;
}) {
  const { t } = useTranslation();
  const { setActivePageId } = useActivePageActions();
  const segments = useMemo(() => parseBody(body), [body]);

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === "text") return <span key={i}>{seg.text}</span>;
        if (seg.kind === "person") {
          const name =
            peopleById.get(seg.id)?.name ?? t("chat.someone", "someone");
          return (
            <span
              key={i}
              className={`chat-mention${seg.id === meId ? " chat-mention--me" : ""}`}
            >
              @{name}
            </span>
          );
        }
        const page = pagesById.get(seg.id);
        return page ? (
          <button
            key={i}
            type="button"
            className="chat-page-chip"
            onClick={() => setActivePageId(page.id)}
          >
            <PageItemIcon
              cover={page.cover}
              styles={{ width: 13, height: 13, fontSize: 13 }}
            />
            <span className="chat-page-chip__title">
              {page.title || t("page.untitled")}
            </span>
          </button>
        ) : (
          <span key={i} className="chat-page-chip chat-page-chip--locked">
            <Lock size={11} />
            <span className="chat-page-chip__title">
              {t("chat.privatePage", "Private page")}
            </span>
          </span>
        );
      })}
    </>
  );
}

function MessageRow({
  msg,
  compact,
  author,
  isMine,
  meId,
  peopleById,
  pagesById,
  onDelete,
}: {
  msg: ChatMessage;
  compact: boolean;
  author: ChatPerson | undefined;
  isMine: boolean;
  meId: string | undefined;
  peopleById: Map<string, ChatPerson>;
  pagesById: Map<string, Page>;
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
  const mentionsMe =
    !deleted && !isMine && !!meId && mentionsPerson(msg.body, meId);

  return (
    <div
      className={[
        "chat-msg",
        compact && "chat-msg--compact",
        mentionsMe && "chat-msg--mentions-me",
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
          <p className="chat-msg__body">
            <MessageBody
              body={msg.body}
              meId={meId}
              peopleById={peopleById}
              pagesById={pagesById}
            />
          </p>
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

// "@" + up to 30 non-space chars right before the caret, at the start or
// after whitespace (so emails like a@b.c don't trigger it).
const TRIGGER_RE = /(?:^|\s)@([^\s@]{0,30})$/;

function Composer({
  placeholder,
  people,
  pages,
  onSend,
  onTyping,
}: {
  placeholder: string;
  people: ChatPerson[];
  pages: Page[];
  onSend: (body: string) => void;
  onTyping: (typing: boolean) => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [mentions, setMentions] = useState<DraftMention[]>([]);
  const [trigger, setTrigger] = useState<{
    start: number;
    query: string;
  } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
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

  const pickerItems = useMemo<MentionItem[]>(() => {
    if (!trigger) return [];
    const q = trigger.query.toLowerCase();
    const matchedPeople = people
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, PICKER_LIMIT)
      .map((person) => ({ kind: "person" as const, person }));
    const matchedPages = pages
      .filter(
        (p) =>
          p.category !== "Template" &&
          (p.title || "").toLowerCase().includes(q),
      )
      .slice(0, PICKER_LIMIT)
      .map((page) => ({ kind: "page" as const, page }));
    return [...matchedPeople, ...matchedPages];
  }, [trigger, people, pages]);

  const updateTrigger = (text: string, caret: number) => {
    const m = text.slice(0, caret).match(TRIGGER_RE);
    if (m) {
      setTrigger({ start: caret - m[1].length - 1, query: m[1] });
      setActiveIndex(0);
    } else {
      setTrigger(null);
    }
  };

  const bumpTyping = () => {
    onTyping(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => onTyping(false), 3000);
  };

  const pick = (item: MentionItem) => {
    const el = ref.current;
    if (!el || !trigger) return;
    const caret = el.selectionStart ?? value.length;
    const label =
      item.kind === "person"
        ? item.person.name
        : item.page.title || t("page.untitled");
    const display = `@${label}`;
    const token =
      item.kind === "person"
        ? personToken(item.person.id)
        : pageToken(item.page.id);

    const next =
      value.slice(0, trigger.start) + display + " " + value.slice(caret);
    const nextCaret = trigger.start + display.length + 1;

    setValue(next);
    setMentions((prev) => [...prev, { display, token }]);
    setTrigger(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(serializeDraft(trimmed, mentions));
    setValue("");
    setMentions([]);
    setTrigger(null);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    onTyping(false);
  };

  const pickerOpen = trigger !== null;

  return (
    <div className="chat-composer-wrap">
      {pickerOpen && (
        <MentionPicker
          items={pickerItems}
          activeIndex={activeIndex}
          onPick={pick}
          onHover={setActiveIndex}
        />
      )}
      <div className="chat-composer">
        <textarea
          ref={ref}
          className="chat-composer__input"
          rows={1}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            const text = e.target.value;
            setValue(text);
            updateTrigger(text, e.target.selectionStart ?? text.length);
            if (text) bumpTyping();
          }}
          onClick={(e) =>
            updateTrigger(value, e.currentTarget.selectionStart ?? value.length)
          }
          onBlur={() => {
            onTyping(false);
            setTrigger(null);
          }}
          onKeyDown={(e) => {
            if (pickerOpen && pickerItems.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => (i + 1) % pickerItems.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex(
                  (i) => (i - 1 + pickerItems.length) % pickerItems.length,
                );
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                pick(pickerItems[activeIndex]);
                return;
              }
            }
            if (pickerOpen && e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              setTrigger(null);
              return;
            }
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
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
    </div>
  );
}
