import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-location";
import {
  SbChatsIcon,
  SbHomeIcon,
  SbInboxIcon,
  SbSearchIcon,
} from "src/components/tiptap-icons/sidebar-icons";
import { TbX } from "src/components/tiptap-icons/tabler-icons";
import { useNotificationState } from "src/features/inbox/notification/notification-context";
import { useMyWorkspaceInvites } from "src/hooks/use-workspace-members";
import { useUnreadCounts } from "src/hooks/use-chat";
import { spaceHomePath, useCurrentSpace } from "src/hooks/use-current-space";
import { useIsMobile } from "src/hooks/use-breakpoint";
import { isMac } from "src/lib/tiptap-utils";
import { requestFindFocus } from "src/lib/find-store";
import { useEditorLayout } from "../context/editor-layout-context";
import { SidebarNavCount, SidebarNavRow } from "./sidebar-nav-row";
import { SidebarSearchInput } from "./sidebar-search-input";
import "./sidebar-nav.scss";

type NavId = "pages" | "inbox" | "chats";

// The sidebar's top navigation, one row each: Home, Inbox, Chats, Search.
// Each row swaps what the sidebar body shows; Inbox and Chats carry their
// unread counts. Home again while already on Home goes to the space's home
// page. Search turns its own row into the find input (× or Esc puts the row
// back); the input stays mounted so Ctrl/⌘+Shift+F can focus it at once.
export const SidebarNav = memo(() => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const space = useCurrentSpace();
  const { sidebarView, setSidebarView, onCollapsedChange } = useEditorLayout();

  const { unreadCount } = useNotificationState();
  // Workspace invitations count as something waiting in the inbox.
  const { data: invites = [] } = useMyWorkspaceInvites();
  const { data: chatUnread = {} } = useUnreadCounts();
  const chatTotal = useMemo(
    () => Object.values(chatUnread).reduce((a, b) => a + b, 0),
    [chatUnread],
  );

  const isSearching = sidebarView === "search";
  const active: NavId | null =
    sidebarView === "inbox" || sidebarView === "chats"
      ? sidebarView
      : sidebarView === "pages"
        ? "pages"
        : null;

  // Same shortcut the editor toolbar listens for (Ctrl/⌘ + Shift + F).
  const findShortcut = isMac() ? "⌘ ⇧ F" : "Ctrl ⇧ F";

  const select = (id: NavId) => {
    if (id === "pages" && sidebarView === "pages") {
      const teamspaceId = space.kind === "teamspace" ? space.id : null;
      navigate({ to: spaceHomePath(teamspaceId) });
      if (isMobile) onCollapsedChange(true);
      return;
    }
    setSidebarView(id);
  };

  const openSearch = () => {
    setSidebarView("search");
    requestAnimationFrame(() => requestFindFocus());
  };

  return (
    <nav className="sb-nav" aria-label={t("sidebar.navigation", "Sidebar")}>
      <SidebarNavRow
        icon={<SbHomeIcon />}
        label={t("sidebar.home", "Home")}
        active={active === "pages"}
        onClick={() => select("pages")}
      />
      <SidebarNavRow
        icon={<SbInboxIcon />}
        label={t("sidebar.inbox", "Inbox")}
        active={active === "inbox"}
        trailing={<SidebarNavCount value={unreadCount + invites.length} />}
        onClick={() => select("inbox")}
      />
      <SidebarNavRow
        icon={<SbChatsIcon />}
        label={t("chat.title", "Chats")}
        active={active === "chats"}
        trailing={<SidebarNavCount value={chatTotal} />}
        onClick={() => select("chats")}
      />

      {/* The Search row and the find input share one slot and cross-fade. */}
      <div className={`sb-nav__search${isSearching ? " is-searching" : ""}`}>
        <SidebarNavRow
          className="sb-nav__search-row"
          icon={<SbSearchIcon />}
          label={t("sidebar.search", "Search")}
          trailing={<span className="sb-nav__kbd">{findShortcut}</span>}
          aria-hidden={isSearching}
          tabIndex={isSearching ? -1 : undefined}
          onClick={openSearch}
        />
        <div className="sb-nav__search-input" aria-hidden={!isSearching}>
          <SidebarSearchInput />
          <button
            type="button"
            className="sb-nav__search-close"
            aria-label={t("find.close", "Close search")}
            title={t("find.close", "Close search")}
            tabIndex={isSearching ? 0 : -1}
            onClick={() => setSidebarView("pages")}
          >
            <TbX size={16} strokeWidth={1.7} />
          </button>
        </div>
      </div>
    </nav>
  );
});
SidebarNav.displayName = "SidebarNav";
