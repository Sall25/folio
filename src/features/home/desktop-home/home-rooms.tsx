import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { ChatRoom, Page } from "src/types";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import { fetchLatestMessages } from "src/api/chat";
import {
  useChatPeople,
  useChatRooms,
  useUnreadCounts,
} from "src/hooks/use-chat";
import { useCurrentPerson } from "src/hooks/use-session";
import { parseBody, mentionedPersonIds } from "src/lib/chat-mentions";
import { roomTitle, useOpenChatRoom } from "src/features/chat/chat-utils";
import { homeWhen } from "../home-time";

// The desktop Home's "Latest in rooms": the last message of your most
// recent rooms (the space's rooms, your direct messages, and page
// discussions): where, who, two lines of it, when, and how many are unread.
// Clicking one opens the room. Rooms only store when their last message
// was, so the messages themselves come from fetchLatestMessages, fetched
// again whenever a room gets a new one (its lastMessageAt is in the key).

const ROOMS_SHOWN = 3;
/** Rooms whose last message is fetched: a few more than shown, as some
 *  turn out to have none left (deleted). */
const ROOMS_FETCHED = 6;

export function HomeRooms({
  pages,
  onOpenChats,
}: {
  pages: Page[];
  onOpenChats: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { person: me } = useCurrentPerson();
  const { rooms, dms, all } = useChatRooms();
  const { data: unread = {} } = useUnreadCounts();
  const openRoom = useOpenChatRoom();

  const candidates = useMemo<ChatRoom[]>(() => {
    // Page discussions only for pages you can see (and not in the trash):
    // otherwise they'd show as "Untitled".
    const pageRooms = all.filter(
      (r) =>
        r.kind === "page" &&
        pages.some((p) => p.id === r.pageId && !p.deletedAt),
    );
    return [...rooms, ...dms, ...pageRooms]
      .filter((r) => r.lastMessageAt != null)
      .sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0))
      .slice(0, ROOMS_FETCHED);
  }, [rooms, dms, all, pages]);

  const { data: messages = {}, isFetched } = useQuery({
    queryKey: [
      "chat",
      "latest",
      ...candidates.map((r) => `${r.id}:${r.lastMessageAt}`),
    ],
    queryFn: () => fetchLatestMessages(candidates.map((r) => r.id)),
    enabled: candidates.length > 0,
  });

  // Once fetched, rooms with no message left are skipped.
  const latest = useMemo(
    () =>
      (isFetched ? candidates.filter((r) => messages[r.id]) : candidates).slice(
        0,
        ROOMS_SHOWN,
      ),
    [candidates, messages, isFetched],
  );

  // Names: the authors, the other person of a DM, and anyone mentioned.
  const personIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of latest) {
      if (r.kind === "dm") r.members.forEach((m) => ids.add(m.personId));
      const msg = messages[r.id];
      if (msg?.authorId) ids.add(msg.authorId);
      if (msg) mentionedPersonIds(msg.body).forEach((id) => ids.add(id));
    }
    return [...ids].sort();
  }, [latest, messages]);
  const { data: people = [] } = useChatPeople(personIds);
  const peopleById = useMemo(
    () => new Map(people.map((p) => [p.id, p])),
    [people],
  );

  const titleOf = (room: ChatRoom) => {
    if (room.kind === "page") {
      const page = pages.find((p) => p.id === room.pageId);
      return `${page?.title || t("page.untitled")} · ${t("chat.pageDiscussion", "Discussion")}`;
    }
    const title = roomTitle(room, peopleById, me?.id, t);
    return room.kind === "room" ? `#${title}` : title;
  };

  /** The message as text: mentions by name, "@all", pages as "@page". */
  const textOf = (body: string) =>
    parseBody(body)
      .map((s) =>
        s.kind === "text"
          ? s.text
          : s.kind === "person"
            ? `@${peopleById.get(s.id)?.name ?? "…"}`
            : s.kind === "all"
              ? "@all"
              : `@${pages.find((p) => p.id === s.id)?.title || t("page.untitled")}`,
      )
      .join("")
      .trim();

  return (
    <section>
      <h2 className="dhome__h">
        {t("desktopHome.latestInRooms")}
        <button type="button" className="dhome__link" onClick={onOpenChats}>
          {t("home.allChats")}
        </button>
      </h2>
      <div className="dhome__panel">
        {latest.length === 0 ? (
          <p className="dhome__none">{t("desktopHome.noMessages")}</p>
        ) : (
          <ul className="dhome__msgs">
            {latest.map((room) => {
              const msg = messages[room.id];
              const author = msg?.authorId
                ? msg.authorId === me?.id
                  ? t("home.you")
                  : (peopleById.get(msg.authorId)?.name ?? "…")
                : null;
              const count = unread[room.id] ?? 0;
              return (
                <li key={room.id}>
                  <button
                    type="button"
                    className="dhome__msg"
                    onClick={() => openRoom(room)}
                  >
                    <Avatar
                      name={author ?? titleOf(room)}
                      src={
                        msg?.authorId
                          ? (peopleById.get(msg.authorId)?.avatarUrl ?? null)
                          : null
                      }
                      size="xs"
                      showTooltip={false}
                    />
                    <span className="dhome__msg-body">
                      <span className="dhome__msg-room">
                        <span className="dhome__msg-title">
                          {titleOf(room)}
                        </span>
                        <span className="dhome__msg-when">
                          {homeWhen(
                            msg?.createdAt ?? room.lastMessageAt ?? 0,
                            t,
                            i18n.language,
                          )}
                        </span>
                      </span>
                      {author && (
                        <span className="dhome__msg-who">{author}</span>
                      )}
                      <span className="dhome__msg-text">
                        {msg
                          ? textOf(msg.body) || t("desktopHome.sentAttachment")
                          : "…"}
                      </span>
                    </span>
                    {count > 0 && (
                      <span className="dhome__msg-count">{count}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
