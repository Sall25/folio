import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, ChevronUp, Hash, Lock } from "lucide-react";
import { Card } from "src/components/tiptap-ui-primitive/card";
import type { ChatRoom, Notification } from "src/types";
import { useNotificationState } from "src/features/inbox/notification/notification-context";
import { useOpenNotification } from "src/features/inbox/inbox-panel/use-open-notification";
import {
  otherDmMember,
  roomTitle,
  useOpenChatRoom,
} from "src/features/chat/chat-utils";
import {
  useChatPeople,
  useChatRooms,
  useUnreadCounts,
} from "src/hooks/use-chat";
import { useCurrentPerson } from "src/hooks/use-session";
import { homeWhen } from "./home-time";

// "For you": what's waiting, in a card — notifications (mentions, comments,
// reminders…) and the chat rooms with unread messages, newest first. It shows
// the 2 latest; "Show more" expands it (up to FOR_YOU_MAX). The header counts
// what's unread. Each row: who and where, the notification's text (the
// sentence it quotes), then its status and how long ago — unread rows get a
// red dot, a tint and a "New" badge; read ones are muted with "✓ Read".

const FOR_YOU_COLLAPSED = 2;
const FOR_YOU_MAX = 10;

type Item =
  | {
      kind: "notification";
      key: string;
      at: number;
      unread: boolean;
      n: Notification;
    }
  | {
      kind: "room";
      key: string;
      at: number;
      unread: true;
      room: ChatRoom;
      count: number;
    };

export function HomeForYou({ onOpenInbox }: { onOpenInbox: () => void }) {
  const { t, i18n } = useTranslation();
  const { person } = useCurrentPerson();
  const { notifications } = useNotificationState();
  const openNotification = useOpenNotification();
  const { rooms, dms } = useChatRooms();
  const { data: unread = {} } = useUnreadCounts();
  const openRoom = useOpenChatRoom();
  const [expanded, setExpanded] = useState(false);

  const { items, unreadTotal } = useMemo(() => {
    const list: Item[] = notifications.map((n) => ({
      kind: "notification",
      key: `n:${n.id}`,
      at: new Date(n.timestamp).getTime(),
      unread: !n.read,
      n,
    }));
    for (const room of [...rooms, ...dms]) {
      const count = unread[room.id] ?? 0;
      if (count > 0) {
        list.push({
          kind: "room",
          key: `r:${room.id}`,
          at: room.lastMessageAt ?? room.createdAt,
          unread: true,
          room,
          count,
        });
      }
    }
    return {
      items: list.sort((a, b) => b.at - a.at).slice(0, FOR_YOU_MAX),
      unreadTotal: list.filter((it) => it.unread).length,
    };
  }, [notifications, rooms, dms, unread]);

  const shown = expanded ? items : items.slice(0, FOR_YOU_COLLAPSED);
  const hidden = items.length - FOR_YOU_COLLAPSED;

  // Direct messages are titled with the other person's name.
  const partnerIds = useMemo(
    () =>
      items
        .flatMap((it) =>
          it.kind === "room" && it.room.kind === "dm" ? [it.room] : [],
        )
        .map((r) => otherDmMember(r, person?.id))
        .filter((id): id is string => !!id),
    [items, person?.id],
  );
  const { data: people = [] } = useChatPeople(partnerIds);
  const peopleById = useMemo(
    () => new Map(people.map((p) => [p.id, p])),
    [people],
  );

  const ago = (at: number) => homeWhen(at, t, i18n.language);

  // Status line: "New · 12m ago" or "✓ Read · 2h ago".
  const status = (isUnread: boolean, at: number) => (
    <span className="home-foryou__meta">
      {isUnread ? (
        <span className="home-foryou__badge">{t("home.badgeNew")}</span>
      ) : (
        <span className="home-foryou__read">
          <Check size={12} strokeWidth={2.5} aria-hidden />
          {t("home.read")}
        </span>
      )}
      <span aria-hidden>·</span>
      <span className="home-foryou__time">{ago(at)}</span>
    </span>
  );

  return (
    <Card role="region" className="home-foryou" aria-labelledby="home-foryou">
      <div className="home-foryou__head">
        <h2 id="home-foryou" className="home-dense__label home-foryou__label">
          {t("home.forYou")}
          {unreadTotal > 0 && (
            <span className="home-foryou__unread">
              {t("home.newCount", { count: unreadTotal })}
            </span>
          )}
        </h2>
        <button
          type="button"
          className="home-dense__link home-foryou__link"
          onClick={onOpenInbox}
        >
          {t("home.openInbox")}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="home-foryou__empty">{t("home.allCaughtUp")}</p>
      ) : (
        <ul id="home-foryou-list" className="home-foryou__list">
          {shown.map((it) => {
            if (it.kind === "notification") {
              const { n } = it;
              return (
                <li key={it.key}>
                  <button
                    type="button"
                    className={`home-foryou__row${it.unread ? " is-unread" : ""}`}
                    onClick={() => void openNotification(n)}
                  >
                    <span className="home-foryou__dot" aria-hidden />
                    <span className="home-foryou__text">
                      <span className="home-foryou__title">{n.title}</span>
                      {n.message && (
                        <span className="home-foryou__quote">{n.message}</span>
                      )}
                      {status(it.unread, it.at)}
                    </span>
                  </button>
                </li>
              );
            }
            const title = roomTitle(it.room, peopleById, person?.id, t);
            return (
              <li key={it.key}>
                <button
                  type="button"
                  className="home-foryou__row is-unread"
                  onClick={() => openRoom(it.room)}
                >
                  <span className="home-foryou__dot" aria-hidden />
                  <span className="home-foryou__text">
                    <span className="home-foryou__title">
                      {it.room.kind !== "dm" &&
                        (it.room.visibility === "private" ? (
                          <Lock size={13} aria-hidden />
                        ) : (
                          <Hash size={13} aria-hidden />
                        ))}
                      {title}
                      <span className="home-foryou__count">
                        {" · "}
                        {t("home.newMessages", { count: it.count })}
                      </span>
                    </span>
                    {status(true, it.at)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {hidden > 0 && (
        <button
          type="button"
          className="home-foryou__more"
          aria-expanded={expanded}
          aria-controls="home-foryou-list"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              {t("home.showLess")}
              <ChevronUp size={14} aria-hidden />
            </>
          ) : (
            <>
              {t("home.showMoreCount", { count: hidden })}
              <ChevronDown size={14} aria-hidden />
            </>
          )}
        </button>
      )}
    </Card>
  );
}
