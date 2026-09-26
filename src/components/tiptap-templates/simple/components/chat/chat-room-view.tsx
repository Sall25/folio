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
import type { JSONContent } from "@tiptap/core";
import { useLocation, useNavigate } from "@tanstack/react-location";
import {
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  Database,
  Download,
  FileText,
  Hash,
  Lock,
  LogOut,
  MessageSquare,
  Paperclip,
  Plus,
  Reply,
  SmilePlus,
  Sparkles,
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
import {
  useRoomBlockRefs,
  useSendBlockMessage,
} from "src/hooks/use-chat-blocks";
import { isSessionOpen, useStudySession } from "src/hooks/use-study-session";
import { useRoomRowRefs, useRoomShowcasePage } from "src/hooks/use-chat-rows";
import { useDataSource } from "src/components/tiptap-node/inline-database/hooks/use-data-source";
import { BoardCardCover } from "src/components/tiptap-node/inline-database/primitives/board-card-cover";
import { usePatchPage } from "src/hooks/use-patch-page";
import { useDeleteChatRoom } from "src/hooks/use-delete-chat-room";
import { ConfirmDialog } from "src/components/tiptap-templates/simple/components/confirm-dialog";
import { patchPage } from "src/api/pages";
import type { RowRef } from "src/api/chat-rows";
import { useChatCandidates } from "src/hooks/use-chat-candidates";
import { usePages, usePagesBase } from "src/hooks/use-pages";
import { useCurrentPerson } from "src/hooks/use-session";
import { useNow } from "src/hooks/use-now";
import { spaceHomePath, useCurrentSpace } from "src/hooks/use-current-space";
import { useIsMobile } from "src/hooks/use-breakpoint";
import { useEditorLayout } from "../../context/editor-layout-context";
import { useActivePageActions } from "../../context/active-page-context";
import { PageItemIcon } from "../../page-item-icon";
import type { ChatMessage, ChatPerson, ChatRoom } from "src/types";
import {
  removeChatFile,
  type ChatAttachment,
  type UploadedFile,
} from "src/api/chat-attachments";
import type { BlockRef } from "src/api/chat-blocks";
import type {
  CellValue,
  DatabaseProperty,
  Page,
  PersonValue,
  RelationValue,
  RowTemplate,
  SelectOption,
} from "src/types";
import {
  mentionedPersonIds,
  mentionsPerson,
  pageToken,
  parseBody,
  personToken,
  serializeDraft,
  type DraftMention,
} from "src/lib/chat-mentions";
import { blockContext } from "src/lib/page-blocks";
import {
  consumePendingScrollTarget,
  setPendingScrollTarget,
  subscribePendingScrollTarget,
} from "../inbox-panel/pending-scroll-target";
import { chatRoomIdFromPath, otherDmMember, roomTitle } from "./chat-utils";
import { InviteToRoomModal } from "./chat-modals";
import { MentionPicker, type MentionItem } from "./mention-picker";
import { setPageChatOpen } from "./page-chat-store";
import { StudySessionBar, StudyStartMenu } from "./study-session";
import {
  pageChatKey,
  subscribePendingBlocks,
  takePendingBlock,
  type SharedBlockDraft,
} from "./block-share-store";
import "./chat-room.scss";
import "./mention-picker.scss";
import "./chat-extras.scss";
import "./chat-attachments.scss";
import "./chat-blocks.scss";
import "./block-thread.scss";
import "./chat-showcase.scss";

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const PICKER_LIMIT = 5;
const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "😮", "🙏"];
const LOAD_OLDER_THRESHOLD_PX = 80;
const MAX_JUMP_PAGES = 10;
const NO_PENDING_KEYS: string[] = [];
const NO_PROPS: DatabaseProperty[] = [];
const NO_TEMPLATES: RowTemplate[] = [];
const ROW_CARD_PROPS = 3;

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

  const blockRefs = useRoomBlockRefs(room.id, messages.length);

  // ── Showcase: the room's database, and the rows posted into it ─────────
  const { data: showcasePageId = null } = useRoomShowcasePage(
    room.kind === "room" ? room.id : null,
  );
  const isShowcase = !!showcasePageId;
  const rowRefs = useRoomRowRefs(isShowcase ? room.id : null, messages.length);

  // Block messages whose page you can read become threads; their replies
  // live in the side view. (Locked cards stay flat, so nobody loses replies.)
  const threadable = useMemo(() => {
    const s = new Set<string>();
    blockRefs.forEach((ref, id) => {
      if (ref.snapshot != null) s.add(id);
    });
    // Row messages you can read are threads too: the row's discussion.
    rowRefs.forEach((ref, id) => {
      if (ref.pageId != null) s.add(id);
    });
    return s;
  }, [blockRefs, rowRefs]);

  const repliesByParent = useMemo(() => {
    const m = new Map<string, ChatMessage[]>();
    for (const msg of messages) {
      if (msg.replyToId && threadable.has(msg.replyToId)) {
        const list = m.get(msg.replyToId) ?? [];
        list.push(msg);
        m.set(msg.replyToId, list);
      }
    }
    return m;
  }, [messages, threadable]);

  const mainMessages = useMemo(
    () => messages.filter((m) => !(m.replyToId && threadable.has(m.replyToId))),
    [messages, threadable],
  );

  const [threadFor, setThreadFor] = useState<string | null>(null);

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

  const showcasePage = showcasePageId
    ? pagesById.get(showcasePageId)
    : undefined;
  const showcaseSourceId =
    (showcasePage?.content?.content?.find((n) => n.type === "database")?.attrs
      ?.sourceId as string | undefined) ?? null;
  const {
    source: showcaseSource,
    resolvedRecords: showcaseRows,
    addRecordAsync,
  } = useDataSource(showcaseSourceId);
  const rowsById = useMemo(
    () => new Map<string, Page>(showcaseRows.map((r) => [r.id, r])),
    [showcaseRows],
  );
  const showcaseProps = showcaseSource?.properties ?? NO_PROPS;

  const send = useSendMessage(room.id);
  const sendWithFiles = useSendWithAttachments(room.id);
  const sendBlock = useSendBlockMessage(room.id);
  const del = useDeleteMessage(room.id);
  const join = useJoinChatRoom();
  const leave = useLeaveChatRoom();
  const deleteRoom = useDeleteChatRoom();
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Owner role, or the creator (matches delete_chat_room on the server).
  const canDeleteRoom =
    room.kind === "room" &&
    !!meId &&
    (myMembership?.role === "owner" || room.createdBy === meId);
  console.log("canDeleteRoom", {
    meId,
    createdBy: room.createdBy,
    myRole: myMembership?.role,
    kind: room.kind,
  });
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

  const pendingKeys = useMemo(
    () =>
      room.kind === "page" && room.pageId
        ? [room.id, pageChatKey(room.pageId)]
        : [room.id],
    [room.id, room.kind, room.pageId],
  );

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    let lastDay = "";
    let prev: ChatMessage | null = null;
    for (const msg of mainMessages) {
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
  }, [mainMessages, i18n.language]);

  // ── Scrolling ──────────────────────────────────────────────────────────
  const listRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const anchor = useRef<{ height: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [items.length, attachments.length]);

  useEffect(() => {
    const list = listRef.current;
    const content = contentRef.current;
    if (!list || !content || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (stick.current && !anchor.current) {
        list.scrollTop = list.scrollHeight;
      }
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, []);

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

  // Jump to a message: a thread reply opens its thread; anything else is
  // scrolled to, loading older pages until found (bounded).
  const jumpTo = useCallback(
    async (messageId: string) => {
      const known = messagesById.get(messageId);
      if (known?.replyToId && threadable.has(known.replyToId)) {
        setThreadFor(known.replyToId);
        return;
      }
      if (scrollToMessage(messageId)) return;
      for (let i = 0; i < MAX_JUMP_PAGES; i++) {
        const more = await loadOlderKeepingPosition();
        await nextFrame();
        if (scrollToMessage(messageId) || !more) return;
      }
    },
    [messagesById, threadable, scrollToMessage, loadOlderKeepingPosition],
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

  const onSend = (
    body: string,
    files: UploadedFile[],
    block: SharedBlockDraft | null,
  ) => {
    stick.current = true;
    const replyToId = replyTo?.id ?? null;
    if (block) {
      sendBlock.mutate({
        body,
        replyToId,
        block: {
          pageId: block.pageId,
          blockId: block.blockId,
          snapshot: block.snapshot,
        },
      });
    } else if (files.length) {
      sendWithFiles.mutate({ body, replyToId, attachments: files });
    } else {
      send.mutate({ body, replyToId });
    }
    setReplyTo(null);
  };

  // A reply posted from the side view goes into that block's thread.
  const onSendThreadReply =
    (parentId: string) => (body: string, files: UploadedFile[]) => {
      if (files.length) {
        sendWithFiles.mutate({ body, replyToId: parentId, attachments: files });
      } else {
        send.mutate({ body, replyToId: parentId });
      }
    };

  // Full view: the page (in its own space), scrolled to the block, flashing.
  const openBlock = useCallback(
    (pageId: string, blockId: string) => {
      setPendingScrollTarget({
        pageId,
        targetNodeId: blockId,
        type: "block",
      });
      setActivePageId(pageId);
    },
    [setActivePageId],
  );

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

  const onDeleteRoom = () => {
    setConfirmDelete(false);
    deleteRoom.mutate(
      { roomId: room.id, filePaths: attachmentPaths },
      { onSuccess: () => navigate({ to: spaceHomePath(teamspaceId) }) },
    );
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

  // Share your work = the database's New: a row from the default row
  // template (or the one picked), opened full so it can be filled in. The
  // server trigger posts it into this room.
  const patchRow = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const [sharing, setSharing] = useState(false);
  const shareEntry = async (templateId?: string) => {
    if (!showcaseSource || sharing) return;
    const templates = showcaseSource.rowTemplates ?? [];
    const fallback = showcaseSource.defaultTemplateId ?? null;
    const useTemplate =
      templateId ??
      (fallback && templates.some((t) => t.id === fallback)
        ? fallback
        : undefined);
    setSharing(true);
    try {
      const row = await addRecordAsync(
        useTemplate ? { templateId: useTemplate } : { title: "" },
      );
      // The entry is open to the same people as the showcase database.
      if (showcasePage) {
        patchRow.mutate({
          id: row.id,
          patch: {
            generalAccess: showcasePage.generalAccess,
            generalAccessRole: showcasePage.generalAccessRole,
          },
        });
      }
      setActivePageId(row.id);
    } finally {
      setSharing(false);
    }
  };

  const openShowcase = () => {
    if (showcasePageId) setActivePageId(showcasePageId);
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
        ) : isShowcase ? (
          <Sparkles size={22} />
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
            : isShowcase
              ? t("chat.showcase.start", {
                  name: title,
                  defaultValue:
                    "This is the start of #{{name}}. Share your work to post the first entry.",
                })
              : t("chat.roomStart", {
                  name: title,
                  defaultValue: "This is the start of #{{name}}.",
                })}
      </p>
    </>
  );

  // The open thread (only for a readable, live block message).
  const threadMsg = threadFor ? messagesById.get(threadFor) : undefined;
  const threadRef = threadFor ? blockRefs.get(threadFor) : undefined;
  const threadOpen =
    !!threadMsg &&
    threadMsg.deletedAt == null &&
    !!threadRef &&
    threadRef.snapshot != null &&
    !!threadRef.pageId &&
    !!threadRef.blockId;
  const threadRowRef = threadFor ? rowRefs.get(threadFor) : undefined;
  const rowThreadOpen =
    !!threadMsg && threadMsg.deletedAt == null && !!threadRowRef?.pageId;

  return (
    <div
      className={`chat-room-shell${variant === "panel" ? " is-overlay" : ""}`}
    >
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
              ) : isShowcase ? (
                <Sparkles size={16} />
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
              {isShowcase && (
                <Button variant="ghost" onClick={openShowcase}>
                  <Database className="tiptap-button-icon" />
                  <span className="tiptap-button-text">
                    {t("chat.showcase.open", "Open showcase")}
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
                  {canDeleteRoom && (
                    <Button
                      variant="ghost"
                      tooltip={t("chat.deleteRoom", "Delete room")}
                      disabled={deleteRoom.isPending}
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="tiptap-button-icon" />
                    </Button>
                  )}
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
          <div ref={contentRef}>
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
                  const blockRef = blockRefs.get(msg.id);
                  const rowRef = rowRefs.get(msg.id);
                  const isThread = threadable.has(msg.id);
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
                      blockRef={blockRef}
                      rowRef={rowRef}
                      rowPage={
                        rowRef?.pageId ? rowsById.get(rowRef.pageId) : undefined
                      }
                      rowProps={showcaseProps}
                      threadCount={
                        isThread
                          ? (repliesByParent.get(msg.id)?.length ?? 0)
                          : null
                      }
                      threadActive={threadFor === msg.id}
                      onOpenThread={() => {
                        setPickerFor(null);
                        setThreadFor(msg.id);
                      }}
                      reactions={reactionsByMessage.get(msg.id) ?? []}
                      pickerOpen={pickerFor === msg.id}
                      onTogglePicker={() =>
                        setPickerFor((cur) => (cur === msg.id ? null : msg.id))
                      }
                      onClosePicker={() => setPickerFor(null)}
                      onReact={(emoji, on) => {
                        setPickerFor(null);
                        toggleReaction.mutate({
                          messageId: msg.id,
                          emoji,
                          on,
                        });
                      }}
                      onReply={() =>
                        isThread ? setThreadFor(msg.id) : startReply(msg)
                      }
                      onJumpTo={(id) => void jumpTo(id)}
                      onDelete={() => deleteMessage(msg.id)}
                    />
                  );
                })}
              </>
            )}
          </div>
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

          {isMember && isShowcase ? (
            <ShowcaseShareBar
              templates={showcaseSource?.rowTemplates ?? NO_TEMPLATES}
              defaultTemplateId={showcaseSource?.defaultTemplateId ?? null}
              disabled={!showcaseSource || sharing}
              onShare={(templateId) => void shareEntry(templateId)}
            />
          ) : isMember ? (
            <Composer
              roomId={room.id}
              pendingKeys={pendingKeys}
              placeholder={composerPlaceholder}
              people={mentionablePeople}
              pages={[...pagesById.values()]}
              replyTo={replyTo}
              sending={sendWithFiles.isPending || sendBlock.isPending}
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
              <span>
                {t("chat.viewingOpen", "You're viewing an open room.")}
              </span>
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
      </div>

      {rowThreadOpen && threadMsg && threadRowRef?.pageId && (
        <RowThreadPanel
          key={threadMsg.id}
          msg={threadMsg}
          page={rowsById.get(threadRowRef.pageId)}
          properties={showcaseProps}
          author={
            threadMsg.authorId ? peopleById.get(threadMsg.authorId) : undefined
          }
          replies={repliesByParent.get(threadMsg.id) ?? []}
          reactions={reactionsByMessage.get(threadMsg.id) ?? []}
          meId={meId}
          isMember={isMember}
          peopleById={peopleById}
          pagesById={pagesById}
          attachmentsByMessage={attachmentsByMessage}
          signedUrls={signedUrls}
          onReact={(emoji, on) =>
            toggleReaction.mutate({ messageId: threadMsg.id, emoji, on })
          }
          onOpenFull={() => setActivePageId(threadRowRef.pageId as string)}
          onClose={() => setThreadFor(null)}
          onDeleteReply={deleteMessage}
          composer={
            isMember ? (
              <Composer
                roomId={room.id}
                pendingKeys={NO_PENDING_KEYS}
                placeholder={t(
                  "chat.showcase.replyToEntry",
                  "Reply to this entry…",
                )}
                people={mentionablePeople}
                pages={[...pagesById.values()]}
                replyTo={null}
                sending={sendWithFiles.isPending}
                onCancelReply={() => {}}
                onSend={onSendThreadReply(threadMsg.id)}
                onTyping={setTyping}
                allowBlocks={false}
              />
            ) : null
          }
        />
      )}

      {threadOpen && threadMsg && threadRef && (
        <BlockThreadPanel
          key={threadMsg.id}
          msg={threadMsg}
          blockRef={threadRef}
          page={threadRef.pageId ? pagesById.get(threadRef.pageId) : undefined}
          author={
            threadMsg.authorId ? peopleById.get(threadMsg.authorId) : undefined
          }
          replies={repliesByParent.get(threadMsg.id) ?? []}
          reactions={reactionsByMessage.get(threadMsg.id) ?? []}
          meId={meId}
          isMember={isMember}
          peopleById={peopleById}
          pagesById={pagesById}
          attachmentsByMessage={attachmentsByMessage}
          signedUrls={signedUrls}
          onReact={(emoji, on) =>
            toggleReaction.mutate({ messageId: threadMsg.id, emoji, on })
          }
          onOpenFull={() =>
            openBlock(threadRef.pageId as string, threadRef.blockId as string)
          }
          onClose={() => setThreadFor(null)}
          onDeleteReply={deleteMessage}
          composer={
            isMember ? (
              <Composer
                roomId={room.id}
                pendingKeys={NO_PENDING_KEYS}
                placeholder={t("chat.replyInThread", "Reply to this block…")}
                people={mentionablePeople}
                pages={[...pagesById.values()]}
                replyTo={null}
                sending={sendWithFiles.isPending}
                onCancelReply={() => {}}
                onSend={onSendThreadReply(threadMsg.id)}
                onTyping={setTyping}
                allowBlocks={false}
              />
            ) : null
          }
        />
      )}

      {inviteOpen && (
        <InviteToRoomModal room={room} onClose={() => setInviteOpen(false)} />
      )}

      <ConfirmDialog
        open={confirmDelete}
        message={
          <>
            {t("chat.deleteRoomConfirm", {
              name: title,
              defaultValue:
                "Delete #{{name}}? Its messages, threads and files are deleted for everyone. This can't be undone.",
            })}
            {isShowcase && (
              <>
                {" "}
                {t(
                  "chat.showcase.deleteKeepsDatabase",
                  "The showcase database stays in this space.",
                )}
              </>
            )}
          </>
        }
        confirmLabel={t("chat.deleteRoom", "Delete room")}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={onDeleteRoom}
      />
    </div>
  );
}

// ── Side view: a shared block in context, its reactions and its thread ────────
function BlockThreadPanel({
  msg,
  blockRef,
  page,
  author,
  replies,
  reactions,
  meId,
  isMember,
  peopleById,
  pagesById,
  attachmentsByMessage,
  signedUrls,
  onReact,
  onOpenFull,
  onClose,
  onDeleteReply,
  composer,
}: {
  msg: ChatMessage;
  blockRef: BlockRef;
  page: Page | undefined;
  author: ChatPerson | undefined;
  replies: ChatMessage[];
  reactions: ReactionGroup[];
  meId: string | undefined;
  isMember: boolean;
  peopleById: Map<string, ChatPerson>;
  pagesById: Map<string, Page>;
  attachmentsByMessage: Map<string, ChatAttachment[]>;
  signedUrls: Record<string, string>;
  onReact: (emoji: string, on: boolean) => void;
  onOpenFull: () => void;
  onClose: () => void;
  onDeleteReply: (id: string) => void;
  composer: React.ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const snapshot = blockRef.snapshot ?? "";
  // Live context from the page's content; null text → block is gone.
  const ctx = useMemo(
    () =>
      page && blockRef.blockId
        ? blockContext(
            page.content as JSONContent | undefined,
            blockRef.blockId,
          )
        : { before: null, text: null, after: null },
    [page, blockRef.blockId],
  );
  const removed = ctx.text == null;
  // The snapshot may be truncated (… at the end) — compare the prefix.
  const snapshotCore = snapshot.replace(/…$/, "").trim();
  const edited =
    !removed && !!snapshotCore && !(ctx.text ?? "").startsWith(snapshotCore);

  // Keep the thread scrolled to its newest reply.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [replies.length]);

  // Esc closes the side view (unless something inside handled it).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const time = (ts: number) =>
    new Date(ts).toLocaleTimeString(i18n.language, {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <aside className="bt-panel" aria-label={t("chat.thread", "Thread")}>
      <header className="bt-panel__head">
        <span className="bt-panel__head-icon">
          {page ? (
            <PageItemIcon
              cover={page.cover}
              styles={{ width: 15, height: 15, fontSize: 15 }}
            />
          ) : (
            <FileText size={15} />
          )}
        </span>
        <div className="bt-panel__heading">
          <span className="bt-panel__title">
            {page?.title || t("page.untitled")}
          </span>
          <span className="bt-panel__sub">
            {t("chat.sharedBy", {
              name: author?.name ?? t("chat.someone", "someone"),
              defaultValue: "Shared by {{name}}",
            })}{" "}
            · {time(msg.createdAt)}
          </span>
        </div>
        <button
          type="button"
          className="bt-panel__icon-btn"
          aria-label={t("chat.openBlock", "Open in page")}
          title={t("chat.openBlock", "Open in page")}
          onClick={onOpenFull}
          disabled={removed}
        >
          <ArrowUpRight size={16} />
        </button>
        <button
          type="button"
          className="bt-panel__icon-btn"
          aria-label={t("actions.close", "Close")}
          title={t("actions.close", "Close")}
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </header>

      <div className="bt-panel__body" ref={bodyRef}>
        {ctx.before && <div className="bt-context">{ctx.before}</div>}
        <div className={`bt-focus${removed ? " is-removed" : ""}`}>
          {removed ? snapshot : ctx.text}
        </div>
        {ctx.after && <div className="bt-context">{ctx.after}</div>}

        {removed && (
          <p className="bt-note">
            {t(
              "chat.blockRemoved",
              "This block is no longer on the page — showing the version that was shared.",
            )}
          </p>
        )}
        {edited && (
          <>
            <p className="bt-note">
              <strong>
                {t("chat.editedSinceShared", "Edited since shared.")}
              </strong>{" "}
              {t("chat.sharedVersion", "The shared version:")}
            </p>
            <div className="bt-shared">{snapshot}</div>
          </>
        )}

        {msg.body.trim() && (
          <div className="bt-message">
            <div className="bt-message__by">
              <strong>{author?.name ?? t("chat.unknown", "Someone")}</strong>
            </div>
            <MessageBody
              body={msg.body}
              meId={meId}
              peopleById={peopleById}
              pagesById={pagesById}
            />
          </div>
        )}

        <div className="bt-reactions">
          {reactions.map((g) => (
            <button
              key={g.emoji}
              type="button"
              className={`chat-reaction${g.mine ? " is-mine" : ""}`}
              disabled={!isMember}
              onClick={() => onReact(g.emoji, !g.mine)}
            >
              <span className="chat-reaction__emoji">{g.emoji}</span>
              <span>{g.count}</span>
            </button>
          ))}
          {isMember && (
            <button
              type="button"
              className="bt-add-reaction"
              aria-label={t("chat.react", "Add reaction")}
              title={t("chat.react", "Add reaction")}
              onClick={() => setPickerOpen((v) => !v)}
            >
              <SmilePlus size={13} />
            </button>
          )}
          {pickerOpen && (
            <div className="chat-emoji-pop" role="menu">
              {QUICK_REACTIONS.map((emoji) => {
                const mine = reactions.some((g) => g.emoji === emoji && g.mine);
                return (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={emoji}
                    onClick={() => {
                      setPickerOpen(false);
                      onReact(emoji, !mine);
                    }}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bt-thread-label">
          {t("chat.replies", {
            count: replies.length,
            defaultValue: "{{count}} replies",
          })}
        </div>

        {replies.length === 0 ? (
          <div className="bt-empty">
            {t("chat.noReplies", "No replies yet — start the thread.")}
          </div>
        ) : (
          replies.map((r) => {
            const rAuthor = r.authorId ? peopleById.get(r.authorId) : undefined;
            const rName = rAuthor?.name ?? t("chat.unknown", "Someone");
            const rDeleted = r.deletedAt != null;
            const rPending = r.id.startsWith("pending-");
            const files = attachmentsByMessage.get(r.id) ?? [];
            return (
              <div
                key={r.id}
                className={`bt-reply${rPending ? " is-pending" : ""}`}
              >
                <Avatar
                  size="sm"
                  src={rAuthor?.avatarUrl ?? undefined}
                  name={rName}
                />
                <div className="bt-reply__main">
                  <div className="bt-reply__head">
                    <strong>{rName}</strong>
                    <span>{time(r.createdAt)}</span>
                  </div>
                  {rDeleted ? (
                    <p className="bt-reply__body is-deleted">
                      {t("chat.deleted", "Message deleted")}
                    </p>
                  ) : (
                    <>
                      {r.body.trim() && (
                        <p className="bt-reply__body">
                          <MessageBody
                            body={r.body}
                            meId={meId}
                            peopleById={peopleById}
                            pagesById={pagesById}
                          />
                        </p>
                      )}
                      {files.length > 0 && (
                        <MessageAttachments
                          attachments={files}
                          signedUrls={signedUrls}
                        />
                      )}
                    </>
                  )}
                </div>
                {r.authorId === meId && !rDeleted && !rPending && (
                  <button
                    type="button"
                    className="bt-reply__delete"
                    aria-label={t("chat.deleteMessage", "Delete message")}
                    title={t("chat.deleteMessage", "Delete message")}
                    onClick={() => onDeleteReply(r.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {composer && <div className="bt-panel__bottom">{composer}</div>}
    </aside>
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

// A shared block. Readers of the page: click → the side view. Everyone
// else: a locked card.
function BlockCard({
  blockRef,
  page,
  active,
  onOpen,
}: {
  blockRef: BlockRef;
  page: Page | undefined;
  active: boolean;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  if (!blockRef.pageId || !blockRef.blockId || blockRef.snapshot == null) {
    return (
      <span className="chat-block-card is-locked">
        <span className="chat-block-card__src">
          <Lock size={11} />
          {t("chat.privatePage", "Private page")}
        </span>
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`chat-block-card${active ? " is-active" : ""}`}
      title={t("chat.openThread", "Open the block")}
      onClick={onOpen}
    >
      <span className="chat-block-card__src">
        {page ? (
          <PageItemIcon
            cover={page.cover}
            styles={{ width: 12, height: 12, fontSize: 12 }}
          />
        ) : (
          <FileText size={12} />
        )}
        {page?.title || t("page.untitled")}
      </span>
      <span className="chat-block-card__text">{blockRef.snapshot}</span>
    </button>
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
  blockRef,
  rowRef,
  rowPage,
  rowProps,
  threadCount,
  threadActive,
  onOpenThread,
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
  blockRef: BlockRef | undefined;
  /** Set when this message is a showcase entry (a posted database row). */
  rowRef: RowRef | undefined;
  rowPage: Page | undefined;
  rowProps: DatabaseProperty[];
  /** Reply count when this message is a block thread; null otherwise. */
  threadCount: number | null;
  threadActive: boolean;
  onOpenThread: () => void;
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
            {rowRef && (
              <RowCard
                rowRef={rowRef}
                page={rowPage}
                properties={rowProps}
                active={threadActive}
                onOpen={onOpenThread}
              />
            )}
            {blockRef && (
              <BlockCard
                blockRef={blockRef}
                page={
                  blockRef.pageId ? pagesById.get(blockRef.pageId) : undefined
                }
                active={threadActive}
                onOpen={onOpenThread}
              />
            )}
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

        {!deleted && threadCount != null && threadCount > 0 && (
          <button
            type="button"
            className="chat-thread-link"
            onClick={onOpenThread}
          >
            <MessageSquare size={13} />
            {t("chat.replies", {
              count: threadCount,
              defaultValue: "{{count}} replies",
            })}
          </button>
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
            aria-label={
              threadCount != null
                ? t("chat.replyInThreadShort", "Reply in thread")
                : t("chat.reply", "Reply")
            }
            title={
              threadCount != null
                ? t("chat.replyInThreadShort", "Reply in thread")
                : t("chat.reply", "Reply")
            }
            onClick={onReply}
          >
            {threadCount != null ? (
              <MessageSquare size={15} />
            ) : (
              <Reply size={15} />
            )}
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

// ── Showcase entries: a database row posted into the room ────────────────────

type CellChip = { text: string; color?: string };

// A compact, read-only rendering of one cell for cards and the side view.
function cellChips(
  prop: DatabaseProperty,
  value: CellValue | null | undefined,
  t: TFunction,
): CellChip[] {
  if (value == null || value === "") return [];
  const cfg = prop.config;
  switch (cfg.type) {
    case "title":
      return [];
    case "select": {
      const o = value as SelectOption;
      return o?.label ? [{ text: o.label, color: o.color }] : [];
    }
    case "multi_select":
      return (value as SelectOption[]).map((o) => ({
        text: o.label,
        color: o.color,
      }));
    case "status": {
      const item = cfg.groups
        .flatMap((g) => g.items)
        .find((i) => i.id === value);
      return item ? [{ text: item.name, color: item.color }] : [];
    }
    case "checkbox":
      return value === true ? [{ text: `✓ ${prop.name}` }] : [];
    case "person": {
      const people = value as PersonValue[];
      return people.length
        ? [{ text: people.map((p) => p.name).join(", ") }]
        : [];
    }
    case "relation": {
      const links = value as RelationValue[];
      return links.length
        ? [
            {
              text: links.map((l) => l.title || t("page.untitled")).join(", "),
            },
          ]
        : [];
    }
    case "date": {
      const d = value as string | { start: string; end?: string };
      const fmt = (iso: string) => new Date(iso).toLocaleDateString();
      return [
        {
          text:
            typeof d === "string"
              ? fmt(d)
              : d.end
                ? `${fmt(d.start)} → ${fmt(d.end)}`
                : fmt(d.start),
        },
      ];
    }
    case "created_time":
    case "edited_time":
      return [{ text: new Date(value as number).toLocaleDateString() }];
    case "created_by":
    case "edited_by":
      return [];
    default:
      return [{ text: String(value) }];
  }
}

const chipStyle = (color?: string) =>
  color
    ? {
        color: `var(--tt-color-text-${color})`,
        background: `color-mix(in srgb, var(--tt-color-text-${color}) 12%, transparent)`,
      }
    : undefined;

function RowCard({
  rowRef,
  page,
  properties,
  active,
  onOpen,
}: {
  rowRef: RowRef;
  page: Page | undefined;
  properties: DatabaseProperty[];
  active: boolean;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  if (!rowRef.pageId) {
    return (
      <span className="chat-block-card is-locked">
        <span className="chat-block-card__src">
          <Lock size={11} />
          {t("chat.privatePage", "Private page")}
        </span>
      </span>
    );
  }
  if (!page) {
    return (
      <span className="chat-row-card is-removed">
        {t("chat.showcase.entryRemoved", "This entry was removed.")}
      </span>
    );
  }
  const chips = properties
    .flatMap((p) => cellChips(p, page.values?.[p.id], t))
    .slice(0, ROW_CARD_PROPS);
  return (
    <button
      type="button"
      className={`chat-row-card${active ? " is-active" : ""}`}
      title={t("chat.showcase.openEntry", "Open the entry")}
      onClick={onOpen}
    >
      <span className="chat-row-card__cover">
        <BoardCardCover page={page} recordId={page.id} height={120} />
      </span>
      <span className="chat-row-card__body">
        <span className="chat-row-card__title">
          <PageItemIcon
            cover={page.cover}
            styles={{ width: 14, height: 14, fontSize: 14 }}
          />
          {page.title || t("page.untitled")}
        </span>
        {chips.length > 0 && (
          <span className="chat-row-card__chips">
            {chips.map((c, i) => (
              <span
                key={i}
                className="chat-row-chip"
                style={chipStyle(c.color)}
              >
                {c.text}
              </span>
            ))}
          </span>
        )}
      </span>
    </button>
  );
}

// ── Side view: a showcase entry, its properties, reactions and thread ────────
function RowThreadPanel({
  msg,
  page,
  properties,
  author,
  replies,
  reactions,
  meId,
  isMember,
  peopleById,
  pagesById,
  attachmentsByMessage,
  signedUrls,
  onReact,
  onOpenFull,
  onClose,
  onDeleteReply,
  composer,
}: {
  msg: ChatMessage;
  page: Page | undefined;
  properties: DatabaseProperty[];
  author: ChatPerson | undefined;
  replies: ChatMessage[];
  reactions: ReactionGroup[];
  meId: string | undefined;
  isMember: boolean;
  peopleById: Map<string, ChatPerson>;
  pagesById: Map<string, Page>;
  attachmentsByMessage: Map<string, ChatAttachment[]>;
  signedUrls: Record<string, string>;
  onReact: (emoji: string, on: boolean) => void;
  onOpenFull: () => void;
  onClose: () => void;
  onDeleteReply: (id: string) => void;
  composer: React.ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [replies.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const time = (ts: number) =>
    new Date(ts).toLocaleTimeString(i18n.language, {
      hour: "2-digit",
      minute: "2-digit",
    });

  const fields = page
    ? properties
        .map((p) => ({ prop: p, chips: cellChips(p, page.values?.[p.id], t) }))
        .filter((f) => f.chips.length > 0)
    : [];

  return (
    <aside className="bt-panel" aria-label={t("chat.thread", "Thread")}>
      <header className="bt-panel__head">
        <span className="bt-panel__head-icon">
          {page ? (
            <PageItemIcon
              cover={page.cover}
              styles={{ width: 15, height: 15, fontSize: 15 }}
            />
          ) : (
            <FileText size={15} />
          )}
        </span>
        <div className="bt-panel__heading">
          <span className="bt-panel__title">
            {page?.title || t("page.untitled")}
          </span>
          <span className="bt-panel__sub">
            {t("chat.sharedBy", {
              name: author?.name ?? t("chat.someone", "someone"),
              defaultValue: "Shared by {{name}}",
            })}{" "}
            · {time(msg.createdAt)}
          </span>
        </div>
        <button
          type="button"
          className="bt-panel__icon-btn"
          aria-label={t("chat.openPage", "Open page")}
          title={t("chat.openPage", "Open page")}
          onClick={onOpenFull}
          disabled={!page}
        >
          <ArrowUpRight size={16} />
        </button>
        <button
          type="button"
          className="bt-panel__icon-btn"
          aria-label={t("actions.close", "Close")}
          title={t("actions.close", "Close")}
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </header>

      <div className="bt-panel__body" ref={bodyRef}>
        {page ? (
          <>
            <div className="chat-row-panel__cover">
              <BoardCardCover page={page} recordId={page.id} height={150} />
            </div>
            {fields.length > 0 && (
              <dl className="chat-row-panel__props">
                {fields.map(({ prop, chips }) => (
                  <div key={prop.id} className="chat-row-panel__prop">
                    <dt>{prop.name}</dt>
                    <dd>
                      {chips.map((c, i) => (
                        <span
                          key={i}
                          className="chat-row-chip"
                          style={chipStyle(c.color)}
                        >
                          {c.text}
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </>
        ) : (
          <p className="bt-note">
            {t("chat.showcase.entryRemoved", "This entry was removed.")}
          </p>
        )}

        <div className="bt-reactions">
          {reactions.map((g) => (
            <button
              key={g.emoji}
              type="button"
              className={`chat-reaction${g.mine ? " is-mine" : ""}`}
              disabled={!isMember}
              onClick={() => onReact(g.emoji, !g.mine)}
            >
              <span className="chat-reaction__emoji">{g.emoji}</span>
              <span>{g.count}</span>
            </button>
          ))}
          {isMember && (
            <button
              type="button"
              className="bt-add-reaction"
              aria-label={t("chat.react", "Add reaction")}
              title={t("chat.react", "Add reaction")}
              onClick={() => setPickerOpen((v) => !v)}
            >
              <SmilePlus size={13} />
            </button>
          )}
          {pickerOpen && (
            <div className="chat-emoji-pop" role="menu">
              {QUICK_REACTIONS.map((emoji) => {
                const mine = reactions.some((g) => g.emoji === emoji && g.mine);
                return (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={emoji}
                    onClick={() => {
                      setPickerOpen(false);
                      onReact(emoji, !mine);
                    }}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bt-thread-label">
          {t("chat.replies", {
            count: replies.length,
            defaultValue: "{{count}} replies",
          })}
        </div>

        {replies.length === 0 ? (
          <div className="bt-empty">
            {t("chat.showcase.noReplies", "No feedback yet — be the first.")}
          </div>
        ) : (
          replies.map((r) => {
            const rAuthor = r.authorId ? peopleById.get(r.authorId) : undefined;
            const rName = rAuthor?.name ?? t("chat.unknown", "Someone");
            const rDeleted = r.deletedAt != null;
            const rPending = r.id.startsWith("pending-");
            const files = attachmentsByMessage.get(r.id) ?? [];
            return (
              <div
                key={r.id}
                className={`bt-reply${rPending ? " is-pending" : ""}`}
              >
                <Avatar
                  size="sm"
                  src={rAuthor?.avatarUrl ?? undefined}
                  name={rName}
                />
                <div className="bt-reply__main">
                  <div className="bt-reply__head">
                    <strong>{rName}</strong>
                    <span>{time(r.createdAt)}</span>
                  </div>
                  {rDeleted ? (
                    <p className="bt-reply__body is-deleted">
                      {t("chat.deleted", "Message deleted")}
                    </p>
                  ) : (
                    <>
                      {r.body.trim() && (
                        <p className="bt-reply__body">
                          <MessageBody
                            body={r.body}
                            meId={meId}
                            peopleById={peopleById}
                            pagesById={pagesById}
                          />
                        </p>
                      )}
                      {files.length > 0 && (
                        <MessageAttachments
                          attachments={files}
                          signedUrls={signedUrls}
                        />
                      )}
                    </>
                  )}
                </div>
                {r.authorId === meId && !rDeleted && !rPending && (
                  <button
                    type="button"
                    className="bt-reply__delete"
                    aria-label={t("chat.deleteMessage", "Delete message")}
                    title={t("chat.deleteMessage", "Delete message")}
                    onClick={() => onDeleteReply(r.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {composer && <div className="bt-panel__bottom">{composer}</div>}
    </aside>
  );
}

// ── Showcase bottom bar: the database's New, as the room's action ────────────
function ShowcaseShareBar({
  templates,
  defaultTemplateId,
  disabled,
  onShare,
}: {
  templates: RowTemplate[];
  defaultTemplateId: string | null;
  disabled: boolean;
  onShare: (templateId?: string) => void;
}) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Template names live on their pages (row-template pages carry a sourceId,
  // so they're only in the base list), same as NewRecordButton.
  const { data: names } = usePagesBase((all) => {
    const ids = new Set(templates.map((tpl) => tpl.pageId));
    const map: Record<string, string> = {};
    for (const p of all) if (ids.has(p.id)) map[p.id] = p.title;
    return map;
  });

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  return (
    <div className="chat-share-bar" ref={wrapRef}>
      <div className="chat-share-bar__split">
        <button
          type="button"
          className="chat-share-bar__main"
          disabled={disabled}
          onClick={() => onShare()}
        >
          <Plus size={16} />
          {t("chat.showcase.share", "Share your work")}
        </button>
        {templates.length > 0 && (
          <button
            type="button"
            className="chat-share-bar__more"
            aria-label={t("chat.showcase.pickTemplate", "Choose a template")}
            aria-expanded={menuOpen}
            disabled={disabled}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <ChevronDown size={16} />
          </button>
        )}
      </div>

      {menuOpen && (
        <div className="chat-share-bar__menu" role="menu">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onShare(tpl.id);
              }}
            >
              <span>
                {(tpl.pageId && names?.[tpl.pageId]) ||
                  tpl.name ||
                  t("chat.showcase.untitledTemplate", "Untitled template")}
              </span>
              {tpl.id === defaultTemplateId && (
                <Check size={14} className="chat-share-bar__default" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const TRIGGER_RE = /(?:^|\s)@([^\s@]{0,30})$/;

function Composer({
  roomId,
  pendingKeys,
  placeholder,
  people,
  pages,
  replyTo,
  sending,
  onCancelReply,
  onSend,
  onTyping,
  allowBlocks = true,
}: {
  roomId: string;
  pendingKeys: string[];
  placeholder: string;
  people: ChatPerson[];
  pages: Page[];
  replyTo: ReplyContext | null;
  sending: boolean;
  onCancelReply: () => void;
  onSend: (
    body: string,
    files: UploadedFile[],
    block: SharedBlockDraft | null,
  ) => void;
  onTyping: (typing: boolean) => void;
  /** The side view's composer doesn't take shared blocks. */
  allowBlocks?: boolean;
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
  const [block, setBlock] = useState<SharedBlockDraft | null>(null);
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

  useEffect(() => {
    if (!allowBlocks || pendingKeys.length === 0) return;
    const take = () => {
      for (const key of pendingKeys) {
        const draft = takePendingBlock(key);
        if (draft) {
          setBlock(draft);
          ref.current?.focus();
          return;
        }
      }
    };
    const raf = requestAnimationFrame(take);
    const unsub = subscribePendingBlocks(take);
    return () => {
      cancelAnimationFrame(raf);
      unsub();
    };
  }, [pendingKeys, allowBlocks]);

  const replyId = replyTo?.id ?? null;
  useEffect(() => {
    if (replyId) ref.current?.focus();
  }, [replyId]);

  const addFiles = (files: File[]) => {
    if (!files.length) return;
    if (block) {
      setNotice(
        t(
          "chat.blockOrFiles",
          "Remove the block to attach files — a message carries one or the other.",
        ),
      );
      return;
    }
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
    (value.trim().length > 0 || uploads.done.length > 0 || !!block);

  const submit = () => {
    if (!canSend) return;
    onSend(serializeDraft(value.trim(), mentions), uploads.done, block);
    setValue("");
    setMentions([]);
    setTrigger(null);
    setNotice(null);
    setBlock(null);
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

      {block && (
        <div className="chat-block-draft">
          <div className="chat-block-card is-static">
            <span className="chat-block-card__src">
              <FileText size={12} />
              {block.pageTitle || t("page.untitled")}
            </span>
            <span className="chat-block-card__text">{block.snapshot}</span>
          </div>
          <button
            type="button"
            className="chat-block-draft__remove"
            aria-label={t("chat.removeBlock", "Remove block")}
            title={t("chat.removeBlock", "Remove block")}
            onClick={() => setBlock(null)}
          >
            <X size={13} />
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
          disabled={!!block}
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
          placeholder={
            block
              ? t("chat.askAboutBlock", "Ask about this block…")
              : placeholder
          }
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
