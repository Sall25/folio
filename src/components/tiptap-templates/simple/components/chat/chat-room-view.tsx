import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useLocation, useNavigate } from "@tanstack/react-location";
import {
  ArrowUp,
  Download,
  FileText,
  Hash,
  Lock,
  LogOut,
  Paperclip,
  Reply,
  SmilePlus,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  useChatMessages,
  useChatPeople,
  useChatRoom,
  useDeleteMessage,
  useJoinChatRoom,
  useLeaveChatRoom,
  useLoadOlderMessages,
  useMarkRoomRead,
  useRoomPresence,
  useSendMessage,
} from "src/hooks/use-chat";
import {
  groupReactions,
  useRoomReactions,
  useToggleReaction,
  type ReactionGroup,
} from "src/hooks/use-chat-reactions";
import {
  useChatUploads,
  useRoomAttachments,
  useSendWithAttachments,
  useSignedUrls,
} from "src/hooks/use-chat-attachments";
import { isSessionOpen, useStudySession } from "src/hooks/use-study-session";
import { useChatCandidates } from "src/hooks/use-chat-candidates";
import { usePages } from "src/hooks/use-pages";
import { useCurrentPerson } from "src/hooks/use-session";
import { useNow } from "src/hooks/use-now";
import { spaceHomePath, useCurrentSpace } from "src/hooks/use-current-space";
import { useIsMobile } from "src/hooks/use-breakpoint";
import { useEditorLayout } from "../../context/editor-layout-context";
import { useActivePageActions } from "../../context/active-page-context";
import { PageItemIcon } from "../../page-item-icon";
import {
  removeChatFile,
  type ChatAttachment,
  type UploadedFile,
} from "src/api/chat-attachments";
import type { Page, ChatMessage, ChatPerson, ChatRoom } from "src/types";
import {
  mentionedPersonIds,
  mentionsPerson,
  pageToken,
  parseBody,
  personToken,
  serializeDraft,
  type DraftMention,
} from "src/lib/chat-mentions";
import {
  consumePendingScrollTarget,
  subscribePendingScrollTarget,
} from "../inbox-panel/pending-scroll-target";
import { chatRoomIdFromPath, otherDmMember, roomTitle } from "./chat-utils";
import { InviteToRoomModal } from "./chat-modals";
import { MentionPicker, type MentionItem } from "./mention-picker";
import { setPageChatOpen } from "./page-chat-store";
import { StudySessionBar, StudyStartMenu } from "./study-session";
import "./chat-room.scss";
import "./mention-picker.scss";
import "./chat-extras.scss";
import "./chat-attachments.scss";

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const PICKER_LIMIT = 5;
const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "😮", "🙏"];
const LOAD_OLDER_THRESHOLD_PX = 80;
const MAX_JUMP_PAGES = 10;

const nextFrame = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

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
        <RoomContent key={room.id} room={room} variant="full" />
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

function plainExcerpt(
  body: string,
  peopleById: Map<string, ChatPerson>,
  pagesById: Map<string, Page>,
  t: TFunction,
): string {
  const text = parseBody(body)
    .map((seg) => {
      if (seg.kind === "text") return seg.text;
      if (seg.kind === "person")
        return `@${peopleById.get(seg.id)?.name ?? t("chat.someone", "someone")}`;
      return (
        pagesById.get(seg.id)?.title || t("chat.privatePage", "Private page")
      );
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return t("chat.attachment", "Attachment");
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
}

interface ReplyContext {
  id: string;
  authorName: string;
  excerpt: string;
}

export function RoomContent({
  room,
  variant,
}: {
  room: ChatRoom;
  variant: "full" | "panel";
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const space = useCurrentSpace();
  const { person } = useCurrentPerson();
  const { setActivePageId } = useActivePageActions();
  const meId = person?.id;
  const now = useNow();

  const myMembership = room.members.find((m) => m.personId === meId);
  const isMember = !!myMembership;
  const { data: messages = [] } = useChatMessages(room.id);
  const { loadOlder, hasMore, isLoadingOlder } = useLoadOlderMessages(room.id);
  useMarkRoomRead(isMember ? room.id : null, messages.length);
  const { present, typing, setTyping } = useRoomPresence(
    isMember ? room.id : null,
  );

  const { data: reactions = [] } = useRoomReactions(room.id);
  const reactionsByMessage = useMemo(
    () => groupReactions(reactions, meId),
    [reactions, meId],
  );
  const toggleReaction = useToggleReaction(room.id);

  const { data: attachments = [] } = useRoomAttachments(room.id);
  const attachmentsByMessage = useMemo(() => {
    const m = new Map<string, ChatAttachment[]>();
    for (const a of attachments) {
      const list = m.get(a.messageId) ?? [];
      list.push(a);
      m.set(a.messageId, list);
    }
    return m;
  }, [attachments]);
  const attachmentPaths = useMemo(
    () => attachments.map((a) => a.path),
    [attachments],
  );
  const { data: signedUrls = {} } = useSignedUrls(attachmentPaths);

  // Study session: members who can post (i.e. members here — the composer
  // gate) can start/join; the starter or a room owner can stop.
  const study = useStudySession(room.id);
  const sessionOpen = isSessionOpen(study.session, now);
  const canStopSession =
    !!study.session &&
    (study.session.startedBy === meId || myMembership?.role === "owner");

  const personIds = useMemo(() => {
    const ids = new Set<string>(room.members.map((m) => m.personId));
    for (const msg of messages) {
      if (msg.authorId) ids.add(msg.authorId);
      for (const id of mentionedPersonIds(msg.body)) ids.add(id);
    }
    for (const r of reactions) ids.add(r.personId);
    for (const id of study.participants) ids.add(id);
    return [...ids];
  }, [room.members, messages, reactions, study.participants]);
  const { data: people = [] } = useChatPeople(personIds);
  const peopleById = useMemo(
    () => new Map<string, ChatPerson>(people.map((p) => [p.id, p])),
    [people],
  );

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

  const messagesById = useMemo(
    () => new Map(messages.map((m) => [m.id, m])),
    [messages],
  );

  const send = useSendMessage(room.id);
  const sendWithFiles = useSendWithAttachments(room.id);
  const del = useDeleteMessage(room.id);
  const join = useJoinChatRoom();
  const leave = useLeaveChatRoom();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyContext | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const discussedPage =
    room.kind === "page" && room.pageId
      ? pagesById.get(room.pageId)
      : undefined;
  const title =
    room.kind === "page"
      ? discussedPage?.title || t("chat.pageDiscussion", "Discussion")
      : roomTitle(room, peopleById, meId, t);
  const partner =
    room.kind === "dm"
      ? peopleById.get(otherDmMember(room, meId) ?? "")
      : undefined;

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
        !msg.replyToId &&
        prev.authorId === msg.authorId &&
        msg.createdAt - prev.createdAt < GROUP_WINDOW_MS;
      out.push({ kind: "msg", key: msg.id, msg, compact });
      prev = msg;
    }
    return out;
  }, [messages, i18n.language]);

  // ── Scrolling ──────────────────────────────────────────────────────────
  const listRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const anchor = useRef<{ height: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [items.length, attachments.length]);

  const firstMessageId = messages[0]?.id;
  useLayoutEffect(() => {
    const el = listRef.current;
    const a = anchor.current;
    if (!el || !a) return;
    el.scrollTop = el.scrollHeight - a.height + a.top;
    anchor.current = null;
  }, [firstMessageId]);

  const loadOlderKeepingPosition = useCallback(async () => {
    const el = listRef.current;
    if (el) anchor.current = { height: el.scrollHeight, top: el.scrollTop };
    stick.current = false;
    const more = await loadOlder();
    if (anchor.current && !more) anchor.current = null;
    return more;
  }, [loadOlder]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (el.scrollTop < LOAD_OLDER_THRESHOLD_PX && hasMore && !isLoadingOlder) {
      void loadOlderKeepingPosition();
    }
  };

  const scrollToMessage = useCallback((messageId: string): boolean => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-message-id="${messageId}"]`,
    );
    if (!el) return false;
    stick.current = false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("chat-msg--flash");
    void el.offsetWidth;
    el.classList.add("chat-msg--flash");
    window.setTimeout(() => el.classList.remove("chat-msg--flash"), 1600);
    return true;
  }, []);

  const jumpTo = useCallback(
    async (messageId: string) => {
      if (scrollToMessage(messageId)) return;
      for (let i = 0; i < MAX_JUMP_PAGES; i++) {
        const more = await loadOlderKeepingPosition();
        await nextFrame();
        if (scrollToMessage(messageId) || !more) return;
      }
    },
    [scrollToMessage, loadOlderKeepingPosition],
  );

  const hasMessages = messages.length > 0;
  useEffect(() => {
    if (!hasMessages) return;
    const tryConsume = () => {
      const target = consumePendingScrollTarget(room.id);
      if (!target?.targetNodeId) return;
      const id = target.targetNodeId;
      requestAnimationFrame(() => {
        void jumpTo(id);
      });
    };
    tryConsume();
    return subscribePendingScrollTarget(tryConsume);
  }, [hasMessages, room.id, jumpTo]);

  const teamspaceId = space.kind === "teamspace" ? space.id : null;

  const onSend = (body: string, files: UploadedFile[]) => {
    stick.current = true;
    const replyToId = replyTo?.id ?? null;
    if (files.length) {
      sendWithFiles.mutate({ body, replyToId, attachments: files });
    } else {
      send.mutate({ body, replyToId });
    }
    setReplyTo(null);
  };

  // Deleting a message also removes its files from Storage. Only the author
  // can delete a message, and the author owns its uploads.
  const deleteMessage = (messageId: string) => {
    const paths = (attachmentsByMessage.get(messageId) ?? []).map(
      (a) => a.path,
    );
    del.mutate(messageId, {
      onSuccess: () => {
        for (const p of paths) removeChatFile(p).catch(() => {});
      },
    });
  };

  const startReply = (msg: ChatMessage) => {
    setPickerFor(null);
    setReplyTo({
      id: msg.id,
      authorName:
        (msg.authorId && peopleById.get(msg.authorId)?.name) ||
        t("chat.unknown", "Someone"),
      excerpt: plainExcerpt(msg.body, peopleById, pagesById, t),
    });
  };

  const onLeave = () => {
    leave.mutate(room.id, {
      onSuccess: () => navigate({ to: spaceHomePath(teamspaceId) }),
    });
  };

  const openDiscussedPage = () => {
    if (!room.pageId) return;
    setActivePageId(room.pageId);
    setPageChatOpen(true);
  };

  const typingNames = typing.map((p) => p.name.split(" ")[0]).filter(Boolean);

  const composerPlaceholder =
    room.kind === "dm"
      ? t("chat.messageTo", { name: title, defaultValue: "Message {{name}}" })
      : room.kind === "page"
        ? t("chat.messagePage", "Discuss this page…")
        : t("chat.messageRoom", {
            name: title,
            defaultValue: "Message #{{name}}",
          });

  const roomStart = (
    <>
      <span className="chat-room__empty-icon">
        {room.kind === "dm" ? (
          <Avatar src={partner?.avatarUrl ?? undefined} name={title} />
        ) : room.kind === "page" ? (
          <FileText size={22} />
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
          : room.kind === "page"
            ? t("chat.pageStart", "Start the discussion about this page.")
            : t("chat.roomStart", {
                name: title,
                defaultValue: "This is the start of #{{name}}.",
              })}
      </p>
    </>
  );

  return (
    <div className="chat-room">
      {variant === "full" && (
        <header className="chat-room__header">
          <span className="chat-room__icon">
            {room.kind === "dm" ? (
              <Avatar src={partner?.avatarUrl ?? undefined} name={title} />
            ) : room.kind === "page" ? (
              discussedPage ? (
                <PageItemIcon
                  cover={discussedPage.cover}
                  styles={{ width: 16, height: 16, fontSize: 16 }}
                />
              ) : (
                <FileText size={16} />
              )
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
                : room.kind === "page"
                  ? t("chat.pageDiscussion", "Discussion")
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

          <div className="chat-room__actions">
            {isMember && !sessionOpen && <StudyStartMenu study={study} />}
            {room.kind === "page" && discussedPage && (
              <Button variant="ghost" onClick={openDiscussedPage}>
                <FileText className="tiptap-button-icon" />
                <span className="tiptap-button-text">
                  {t("chat.openPage", "Open page")}
                </span>
              </Button>
            )}
            {room.kind === "room" && isMember && (
              <>
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
              </>
            )}
          </div>
        </header>
      )}

      <StudySessionBar
        study={study}
        meId={meId}
        canPost={isMember}
        canStop={canStopSession}
        peopleById={peopleById}
        showIdleStart={variant === "panel"}
      />

      <div className="chat-room__list" ref={listRef} onScroll={onScroll}>
        {items.length === 0 ? (
          <div className="chat-room__empty">{roomStart}</div>
        ) : (
          <>
            {isLoadingOlder ? (
              <div className="chat-history-top">
                {t("chat.loadingOlder", "Loading earlier messages…")}
              </div>
            ) : hasMore ? (
              <div className="chat-history-top">
                <button
                  type="button"
                  onClick={() => void loadOlderKeepingPosition()}
                >
                  {t("chat.loadOlder", "Load earlier messages")}
                </button>
              </div>
            ) : (
              <div className="chat-history-top chat-history-top--start">
                {roomStart}
              </div>
            )}

            {items.map((item) => {
              if (item.kind === "day") {
                return (
                  <div key={item.key} className="chat-day">
                    <span>{item.label}</span>
                  </div>
                );
              }
              const msg = item.msg;
              const original = msg.replyToId
                ? messagesById.get(msg.replyToId)
                : undefined;
              const quote: Quote = msg.replyToId
                ? original
                  ? original.deletedAt != null
                    ? { state: "deleted" }
                    : {
                        state: "ok",
                        id: original.id,
                        authorName:
                          (original.authorId &&
                            peopleById.get(original.authorId)?.name) ||
                          t("chat.unknown", "Someone"),
                        excerpt: plainExcerpt(
                          original.body,
                          peopleById,
                          pagesById,
                          t,
                        ),
                      }
                  : { state: "missing", id: msg.replyToId }
                : null;
              return (
                <MessageRow
                  key={item.key}
                  msg={msg}
                  compact={item.compact}
                  author={
                    msg.authorId ? peopleById.get(msg.authorId) : undefined
                  }
                  isMine={msg.authorId === meId}
                  canInteract={isMember}
                  meId={meId}
                  peopleById={peopleById}
                  pagesById={pagesById}
                  quote={quote}
                  attachments={attachmentsByMessage.get(msg.id) ?? []}
                  signedUrls={signedUrls}
                  reactions={reactionsByMessage.get(msg.id) ?? []}
                  pickerOpen={pickerFor === msg.id}
                  onTogglePicker={() =>
                    setPickerFor((cur) => (cur === msg.id ? null : msg.id))
                  }
                  onClosePicker={() => setPickerFor(null)}
                  onReact={(emoji, on) => {
                    setPickerFor(null);
                    toggleReaction.mutate({ messageId: msg.id, emoji, on });
                  }}
                  onReply={() => startReply(msg)}
                  onJumpTo={(id) => void jumpTo(id)}
                  onDelete={() => deleteMessage(msg.id)}
                />
              );
            })}
          </>
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
            roomId={room.id}
            placeholder={composerPlaceholder}
            people={mentionablePeople}
            pages={[...pagesById.values()]}
            replyTo={replyTo}
            sending={sendWithFiles.isPending}
            onCancelReply={() => setReplyTo(null)}
            onSend={onSend}
            onTyping={setTyping}
          />
        ) : room.kind === "page" ? (
          <div className="chat-join">
            <span>
              {t(
                "chat.pageReadOnly",
                "You can read this discussion. Posting needs comment access to the page.",
              )}
            </span>
          </div>
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

function MessageAttachments({
  attachments,
  signedUrls,
}: {
  attachments: ChatAttachment[];
  signedUrls: Record<string, string>;
}) {
  const { t } = useTranslation();
  const images = attachments.filter((a) => a.mime.startsWith("image/"));
  const files = attachments.filter((a) => !a.mime.startsWith("image/"));

  return (
    <div className="chat-files">
      {images.length > 0 && (
        <div className="chat-images">
          {images.map((a) => {
            const url = signedUrls[a.path];
            return url ? (
              <a
                key={a.id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                title={a.name}
              >
                <img src={url} alt={a.name} loading="lazy" />
              </a>
            ) : (
              <span key={a.id} className="chat-file--pending" />
            );
          })}
        </div>
      )}
      {files.map((a) => {
        const url = signedUrls[a.path];
        return (
          <a
            key={a.id}
            className={`chat-file${url ? "" : " chat-file--pending"}`}
            href={url ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            title={t("chat.download", "Download")}
          >
            <span className="chat-file__icon">
              <FileText size={16} />
            </span>
            <span className="chat-file__text">
              <span className="chat-file__name">{a.name}</span>
              <span className="chat-file__size">{formatSize(a.size)}</span>
            </span>
            <Download size={15} className="chat-file__dl" />
          </a>
        );
      })}
    </div>
  );
}

type Quote =
  | { state: "ok"; id: string; authorName: string; excerpt: string }
  | { state: "deleted" }
  | { state: "missing"; id: string }
  | null;

function MessageRow({
  msg,
  compact,
  author,
  isMine,
  canInteract,
  meId,
  peopleById,
  pagesById,
  quote,
  attachments,
  signedUrls,
  reactions,
  pickerOpen,
  onTogglePicker,
  onClosePicker,
  onReact,
  onReply,
  onJumpTo,
  onDelete,
}: {
  msg: ChatMessage;
  compact: boolean;
  author: ChatPerson | undefined;
  isMine: boolean;
  canInteract: boolean;
  meId: string | undefined;
  peopleById: Map<string, ChatPerson>;
  pagesById: Map<string, Page>;
  quote: Quote;
  attachments: ChatAttachment[];
  signedUrls: Record<string, string>;
  reactions: ReactionGroup[];
  pickerOpen: boolean;
  onTogglePicker: () => void;
  onClosePicker: () => void;
  onReact: (emoji: string, on: boolean) => void;
  onReply: () => void;
  onJumpTo: (messageId: string) => void;
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
  const interactive = canInteract && !pending && !deleted;

  const reactedBy = (g: ReactionGroup) =>
    g.personIds
      .map((id) =>
        id === meId
          ? t("members.you", "(you)").replace(/[()]/g, "")
          : (peopleById.get(id)?.name ?? t("chat.someone", "someone")),
      )
      .join(", ");

  return (
    <div
      data-message-id={msg.id}
      className={[
        "chat-msg",
        compact && "chat-msg--compact",
        mentionsMe && "chat-msg--mentions-me",
        pending && "is-pending",
        pickerOpen && "has-picker",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseLeave={pickerOpen ? onClosePicker : undefined}
    >
      <div className="chat-msg__gutter">
        {compact ? (
          <span className="chat-msg__hover-time">{time}</span>
        ) : (
          <Avatar src={author?.avatarUrl ?? undefined} name={name} />
        )}
      </div>
      <div className="chat-msg__main">
        {quote &&
          (quote.state === "ok" ? (
            <button
              type="button"
              className="chat-quote"
              onClick={() => onJumpTo(quote.id)}
            >
              <span className="chat-quote__line" aria-hidden="true" />
              <span className="chat-quote__author">{quote.authorName}</span>
              <span className="chat-quote__text">{quote.excerpt}</span>
            </button>
          ) : quote.state === "missing" ? (
            <button
              type="button"
              className="chat-quote"
              onClick={() => onJumpTo(quote.id)}
            >
              <span className="chat-quote__line" aria-hidden="true" />
              <span className="chat-quote__text">
                {t("chat.originalEarlier", "Reply to an earlier message")}
              </span>
            </button>
          ) : (
            <span className="chat-quote chat-quote--muted">
              <span className="chat-quote__line" aria-hidden="true" />
              <span className="chat-quote__text">
                {t("chat.originalDeleted", "Original message deleted")}
              </span>
            </span>
          ))}

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
          <>
            {msg.body.trim() && (
              <p className="chat-msg__body">
                <MessageBody
                  body={msg.body}
                  meId={meId}
                  peopleById={peopleById}
                  pagesById={pagesById}
                />
              </p>
            )}
            {attachments.length > 0 && (
              <MessageAttachments
                attachments={attachments}
                signedUrls={signedUrls}
              />
            )}
          </>
        )}

        {!deleted && reactions.length > 0 && (
          <div className="chat-reactions">
            {reactions.map((g) => (
              <button
                key={g.emoji}
                type="button"
                className={`chat-reaction${g.mine ? " is-mine" : ""}`}
                title={reactedBy(g)}
                disabled={!interactive}
                onClick={() => onReact(g.emoji, !g.mine)}
              >
                <span className="chat-reaction__emoji">{g.emoji}</span>
                <span>{g.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {interactive && (
        <div className="chat-msg__bar">
          <button
            type="button"
            aria-label={t("chat.react", "Add reaction")}
            title={t("chat.react", "Add reaction")}
            onClick={onTogglePicker}
          >
            <SmilePlus size={15} />
          </button>
          <button
            type="button"
            aria-label={t("chat.reply", "Reply")}
            title={t("chat.reply", "Reply")}
            onClick={onReply}
          >
            <Reply size={15} />
          </button>
          {isMine && (
            <button
              type="button"
              className="is-danger"
              aria-label={t("chat.deleteMessage", "Delete message")}
              title={t("chat.deleteMessage", "Delete message")}
              onClick={onDelete}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      {interactive && pickerOpen && (
        <div className="chat-emoji-pop" role="menu">
          {QUICK_REACTIONS.map((emoji) => {
            const mine = reactions.some((g) => g.emoji === emoji && g.mine);
            return (
              <button
                key={emoji}
                type="button"
                aria-label={emoji}
                onClick={() => onReact(emoji, !mine)}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const TRIGGER_RE = /(?:^|\s)@([^\s@]{0,30})$/;

function Composer({
  roomId,
  placeholder,
  people,
  pages,
  replyTo,
  sending,
  onCancelReply,
  onSend,
  onTyping,
}: {
  roomId: string;
  placeholder: string;
  people: ChatPerson[];
  pages: Page[];
  replyTo: ReplyContext | null;
  sending: boolean;
  onCancelReply: () => void;
  onSend: (body: string, files: UploadedFile[]) => void;
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
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<number | null>(null);
  const uploads = useChatUploads(roomId);

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

  const replyId = replyTo?.id ?? null;
  useEffect(() => {
    if (replyId) ref.current?.focus();
  }, [replyId]);

  const addFiles = (files: File[]) => {
    if (!files.length) return;
    const problem = uploads.add(files);
    setNotice(
      problem === "tooMany"
        ? t("chat.tooManyFiles", "Up to 10 files per message.")
        : null,
    );
  };

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

  const canSend =
    !uploads.uploading &&
    !sending &&
    (value.trim().length > 0 || uploads.done.length > 0);

  const submit = () => {
    if (!canSend) return;
    onSend(serializeDraft(value.trim(), mentions), uploads.done);
    setValue("");
    setMentions([]);
    setTrigger(null);
    setNotice(null);
    uploads.reset();
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    onTyping(false);
  };

  const pickerOpen = trigger !== null;

  return (
    <div
      className={`chat-composer-wrap${dragging ? " is-dragging" : ""}`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setDragging(false);
        }
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragging(false);
        addFiles(Array.from(e.dataTransfer.files));
      }}
    >
      {pickerOpen && (
        <MentionPicker
          items={pickerItems}
          activeIndex={activeIndex}
          onPick={pick}
          onHover={setActiveIndex}
        />
      )}
      {replyTo && (
        <div className="chat-reply-bar">
          <span className="chat-reply-bar__text">
            {t("chat.replyingTo", "Replying to")}{" "}
            <strong>{replyTo.authorName}</strong> — {replyTo.excerpt}
          </span>
          <button
            type="button"
            aria-label={t("chat.cancelReply", "Cancel reply")}
            title={t("chat.cancelReply", "Cancel reply")}
            onClick={onCancelReply}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {notice && <div className="chat-upload-notice">{notice}</div>}

      {uploads.items.length > 0 && (
        <div className="chat-uploads">
          {uploads.items.map((it) => (
            <div
              key={it.id}
              className={`chat-upload${it.status === "uploading" ? " is-uploading" : ""}`}
            >
              {it.previewUrl ? (
                <img
                  className="chat-upload__thumb"
                  src={it.previewUrl}
                  alt=""
                />
              ) : (
                <span className="chat-upload__icon">
                  <FileText size={16} />
                </span>
              )}
              <span className="chat-upload__text">
                <span className="chat-upload__name">{it.file.name}</span>
                <span
                  className={`chat-upload__status${it.status === "error" ? " is-error" : ""}`}
                >
                  {it.status === "uploading"
                    ? t("chat.uploading", "Uploading…")
                    : it.status === "error"
                      ? it.error === "tooLarge"
                        ? t("chat.fileTooLarge", "Over 25 MB")
                        : t("chat.uploadFailed", "Upload failed")
                      : formatSize(it.file.size)}
                </span>
              </span>
              <button
                type="button"
                className="chat-upload__remove"
                aria-label={t("chat.removeFile", "Remove file")}
                title={t("chat.removeFile", "Remove file")}
                onClick={() => uploads.remove(it.id)}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="chat-composer">
        <button
          type="button"
          className="chat-composer__attach"
          aria-label={t("chat.attach", "Attach files")}
          title={t("chat.attach", "Attach files")}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={16} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
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
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (files.length) {
              e.preventDefault();
              addFiles(files);
            }
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
            if (e.key === "Escape" && (pickerOpen || replyTo)) {
              e.preventDefault();
              e.stopPropagation();
              if (pickerOpen) setTrigger(null);
              else onCancelReply();
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
          disabled={!canSend}
          onClick={submit}
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </div>
  );
}
