import { memo, useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-location";
import { Home, MessagesSquare, Search, X } from "lucide-react";
import { InboxIcon } from "src/components/tiptap-icons";
import { useNotificationState } from "src/components/tiptap-ui/notification/notification-context";
import { useUnreadCounts } from "src/hooks/use-chat";
import { spaceHomePath, useCurrentSpace } from "src/hooks/use-current-space";
import { useIsMobile } from "src/hooks/use-breakpoint";
import {
  useEditorLayout,
  type SidebarView,
} from "../../context/editor-layout-context";
import { SidebarSearchInput } from "./sidebar-search-input";
import { requestFindFocus } from "src/lib/find-store";
import "./sidebar-tabs.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";

type TabId = Extract<SidebarView, "pages" | "inbox" | "chats" | "teams">;

// Home · Inbox · Chats · Teamspaces, with search on the right. The active tab
// shows its label; the others are icons with a count badge. Search swaps the
// tab strip for the find input (same cross-animation as before).
export const SidebarTabs = memo(() => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const space = useCurrentSpace();
  const { sidebarView, setSidebarView, onCollapsedChange } = useEditorLayout();

  const { unreadCount } = useNotificationState();
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

  const tabs: { id: TabId; label: string; icon: ReactNode; badge: number }[] = [
    {
      id: "pages",
      label: t("sidebar.home"),
      icon: <Home className="tiptap-button-icon" />,
      badge: 0,
    },
    {
      id: "inbox",
      label: t("sidebar.inbox"),
      icon: <InboxIcon className="tiptap-button-icon" />,
      badge: unreadCount,
    },
    {
      id: "chats",
      label: t("chat.title", "Chats"),
      icon: <MessagesSquare className="tiptap-button-icon" />,
      badge: chatTotal,
    },
  ];

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

  const toggleSearch = () => {
    if (isSearching) {
      setSidebarView("pages");
    } else {
      setSidebarView("search");
      requestAnimationFrame(() => requestFindFocus());
    }
  };

  return (
    <div className="sb-tabs-shell">
      <div className={`sb-tabs-stack${isSearching ? " is-searching" : ""}`}>
        <div
          className="sb-tabs sb-tabs-stack__tabs"
          role="tablist"
          aria-hidden={isSearching}
        >
          {tabs.map((tab) => {
            const on = tab.id === active;
            return (
              <Button
                key={tab.id}
                type="button"
                role="tab"
                size="large"
                aria-selected={on}
                aria-label={tab.label}
                title={tab.label}
                tabIndex={isSearching ? -1 : 0}
                data-highlighted={on}
                className={`sb-tab${on ? " is-active" : ""}`}
                onClick={() => selectTab(tab.id)}
              >
                <span className="sb-tab__icon">
                  {tab.icon}
                  {tab.badge > 0 && (
                    <span className="sb-tab__badge">
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </span>
                  )}
                </span>
                <span className="tiptap-button-text sb-tab__label">
                  {tab.label}
                </span>
              </Button>
            );
          })}
        </div>

        <div className="sb-tabs-stack__search" aria-hidden={!isSearching}>
          <SidebarSearchInput />
        </div>
      </div>

      <Button
        type="button"
        className={`sb-find-toggle${isSearching ? " is-on" : ""}`}
        aria-label={
          isSearching
            ? t("find.close", "Close search")
            : t("find.open", "Search in pages")
        }
        title={
          isSearching
            ? t("find.close", "Close search")
            : t("find.open", "Search in pages")
        }
        aria-pressed={isSearching}
        onClick={toggleSearch}
      >
        <Search size={16} className="sb-find-toggle__icon is-search" />
        <X size={16} className="sb-find-toggle__icon is-close" />
      </Button>
    </div>
  );
});
SidebarTabs.displayName = "SidebarTabs";
