import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "@tanstack/react-location";
import { EyeOff, Hash, Layout, Lock } from "lucide-react";
import type { ChatRoom } from "src/types";
import { useUnreadCounts } from "src/hooks/use-chat";
import { useUnreadMentions } from "src/hooks/use-chat-mentions";
import { useIsMobile } from "src/hooks/use-breakpoint";
import { useLocalStorage } from "../../hooks/use-local-storage";
import { useEditorLayoutActions } from "../../context/editor-layout-context";
import {
  Section,
  SectionMenuItem,
  SectionMenuLabel,
  SectionMenuSeparator,
} from "../section";
import { chatRoomIdFromPath, useOpenChatRoom } from "../chat/chat-utils";
import "../chat/chats-panel.scss";
import "./rooms-section.scss";

type RoomsSort = "recent" | "name";

// The rooms you've joined in the current space, as a sidebar section — same
// Section shell (collapse, +, menu) as the page sections.
export const RoomsSection = memo(function RoomsSection({
  rooms,
  collapsed,
  onToggleCollapse,
  onAddRoom,
  onHide,
  allowSectionPrefs,
}: {
  rooms: ChatRoom[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onAddRoom?: () => void;
  onHide?: () => void;
  allowSectionPrefs: boolean;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const activeRoomId = chatRoomIdFromPath(location.current.pathname);
  const [sort, setSort] = useLocalStorage<RoomsSort>(
    "folio:rooms-sort",
    "recent",
  );
  const { data: unread = {} } = useUnreadCounts();
  const { data: mentions = {} } = useUnreadMentions();
  const openRoom = useOpenChatRoom();
  const isMobile = useIsMobile();
  const { onCollapsedChange, setCustomizeSidebarOpen } =
    useEditorLayoutActions();

  const untitled = t("chat.untitledRoom", "Untitled room");
  const sorted = useMemo(() => {
    const byName = (a: ChatRoom, b: ChatRoom) =>
      (a.name || untitled).localeCompare(b.name || untitled);
    return [...rooms].sort((a, b) =>
      sort === "name"
        ? byName(a, b)
        : (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0) || byName(a, b),
    );
  }, [rooms, sort, untitled]);

  const menu = (
    <>
      <SectionMenuLabel>{t("sidebar.orderBy", "Order by")}</SectionMenuLabel>
      <SectionMenuItem
        label={t("sidebar.recentActivity", "Recent activity")}
        selected={sort === "recent"}
        closeOnClick={false}
        onClick={() => setSort("recent")}
      />
      <SectionMenuItem
        label={t("sidebar.byName", "Name")}
        selected={sort === "name"}
        closeOnClick={false}
        onClick={() => setSort("name")}
      />
      {allowSectionPrefs && (
        <>
          <SectionMenuSeparator />
          <SectionMenuItem
            icon={<EyeOff size={14} />}
            label={t("sidebar.hideSection", "Hide section")}
            onClick={() => onHide?.()}
          />
          <SectionMenuItem
            icon={<Layout size={14} />}
            label={t("sidebar.customize", "Customize sidebar")}
            onClick={() => setCustomizeSidebarOpen?.(true)}
          />
        </>
      )}
    </>
  );

  return (
    <Section
      label={t("section.rooms", "Rooms")}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      onAddClick={onAddRoom}
      addLabel={t("chat.newRoom", "New room")}
      menu={menu}
      menuLabel={t("section.roomsOptions", "Rooms options")}
    >
      {sorted.map((room) => {
        const count = unread[room.id] ?? 0;
        const mentionCount = mentions[room.id] ?? 0;
        const active = room.id === activeRoomId;
        return (
          <button
            key={room.id}
            type="button"
            className={[
              "sb-room",
              active && "is-active",
              count > 0 && "is-unread",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => {
              openRoom(room);
              if (isMobile) onCollapsedChange(true);
            }}
          >
            <span className="sb-room__icon">
              {room.visibility === "private" ? (
                <Lock size={14} />
              ) : (
                <Hash size={15} />
              )}
            </span>
            <span className="sb-room__name">{room.name || untitled}</span>
            {mentionCount > 0 && (
              <span
                className="chat-row__at"
                title={t("chat.mentionedYou", "You were mentioned")}
              >
                @
              </span>
            )}
            {count > 0 && (
              <span className="chat-row__badge">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        );
      })}
    </Section>
  );
});
