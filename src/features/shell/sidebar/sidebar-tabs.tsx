import { memo, useMemo, type ReactNode } from "react";
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
import {
  useEditorLayout,
  type SidebarView,
} from "../context/editor-layout-context";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "src/components/tiptap-ui-primitive/tooltip";
import { SidebarSearchInput } from "./sidebar-search-input";
import { requestFindFocus } from "src/lib/find-store";
import "./sidebar-tabs.scss";

type TabId = Extract<SidebarView, "pages" | "inbox" | "chats" | "teams">;

// Folio's own glyphs, a size up from the page rows so the tabs stand out.
const TAB_ICON = { size: 18, strokeWidth: 1.7 } as const;

function Tab({
  icon,
  label,
  active,
  count = 0,
  tabIndex,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  count?: number;
  tabIndex?: number;
  onClick: () => void;
}) {
  const button = (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      // Inactive tabs show only their icon, so they carry the name here.
      aria-label={active ? undefined : label}
      tabIndex={tabIndex}
      className={`sb-tab${active ? " is-active" : ""}`}
      onClick={onClick}
    >
      <span className="sb-tab__icon">{icon}</span>
      {active && <span className="sb-tab__label">{label}</span>}
      {count > 0 && (
        <span className="sb-tab__badge">{count > 99 ? "99+" : count}</span>
      )}
    </button>
  );

  if (active) return button;

  // Icon only: the name shows in a tooltip on hover or focus.
  return (
    <Tooltip delay={200}>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

// The sidebar's top navigation: Home · Inbox · Chats side by side, with a
// search button at the end. Each tab swaps what the sidebar body shows. The
// selected tab shows its icon and name; the others show only their icon
// (name in a tooltip) and its unread count.
// Search swaps the tab bar for the find input; × or Esc puts it back.
export const SidebarTabs = memo(() => {
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
  const active: TabId =
    sidebarView === "inbox" ||
    sidebarView === "chats" ||
    sidebarView === "teams"
      ? sidebarView
      : "pages";

  // Same shortcut the editor toolbar listens for (Ctrl/⌘ + Shift + F).
  const findShortcut = isMac() ? "⌘⇧F" : "Ctrl+Shift+F";

  const selectTab = (id: TabId) => {
    // Home again while already on Home → go to the space's home page.
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

  const closeSearch = () => setSidebarView("pages");

  const hiddenTab = isSearching ? -1 : undefined;

  return (
    // The tab bar and the find input share one slot and cross-fade.
    <div className={`sb-nav-search${isSearching ? " is-searching" : ""}`}>
      <div className="sb-nav-search__row" aria-hidden={isSearching}>
        <div
          className="sb-tabs"
          role="tablist"
          aria-label={t("sidebar.navigation", "Sidebar")}
        >
          <Tab
            icon={<SbHomeIcon {...TAB_ICON} />}
            label={t("sidebar.home", "Home")}
            active={!isSearching && active === "pages"}
            tabIndex={hiddenTab}
            onClick={() => selectTab("pages")}
          />
          <Tab
            icon={<SbInboxIcon {...TAB_ICON} />}
            label={t("sidebar.inbox", "Inbox")}
            active={!isSearching && active === "inbox"}
            count={unreadCount + invites.length}
            tabIndex={hiddenTab}
            onClick={() => selectTab("inbox")}
          />
          <Tab
            icon={<SbChatsIcon {...TAB_ICON} />}
            label={t("chat.title", "Chats")}
            active={!isSearching && active === "chats"}
            count={chatTotal}
            tabIndex={hiddenTab}
            onClick={() => selectTab("chats")}
          />
        </div>
        <button
          type="button"
          className="sb-tabs__search"
          aria-label={t("sidebar.search", "Search")}
          title={`${t("find.open", "Search in pages")} (${findShortcut})`}
          tabIndex={hiddenTab}
          onClick={openSearch}
        >
          <SbSearchIcon {...TAB_ICON} />
        </button>
      </div>

      <div className="sb-nav-search__input" aria-hidden={!isSearching}>
        <SidebarSearchInput />
        <button
          type="button"
          className="sb-nav-search__close"
          aria-label={t("find.close", "Close search")}
          title={t("find.close", "Close search")}
          tabIndex={isSearching ? 0 : -1}
          onClick={closeSearch}
        >
          <TbX size={16} strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
});
SidebarTabs.displayName = "SidebarTabs";
