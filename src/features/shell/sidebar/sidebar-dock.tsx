import { memo, useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-location";
import {
  SbChatsIcon,
  SbHomeIcon,
  SbInboxIcon,
} from "src/components/tiptap-icons/sidebar-icons";
import { useNotificationState } from "src/features/inbox/notification/notification-context";
import { useMyWorkspaceInvites } from "src/hooks/use-workspace-members";
import { useMyInvites } from "src/hooks/use-teamspace-members";
import { useUnreadCounts } from "src/hooks/use-chat";
import { spaceHomePath, useCurrentSpace } from "src/hooks/use-current-space";
import { useIsMobile } from "src/hooks/use-breakpoint";
import { useSpaceAccent } from "../space-accent/space-accent";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "src/components/tiptap-ui-primitive/tooltip";
import { useEditorLayout } from "../context/editor-layout-context";
import { SidebarSearchInput } from "./sidebar-search-input";
import { SidebarAccount } from "./sidebar-account";
import "./sidebar-dock.scss";

const DOCK_ICON = { size: 18, strokeWidth: 1.8 } as const;

function DockTab({
  icon,
  label,
  active = false,
  count = 0,
  vertical = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  count?: number;
  vertical?: boolean;
  onClick: () => void;
}) {
  const badge = count > 0 && (
    <span className="sb-dock__badge" aria-hidden>
      {count > 99 ? "99+" : count}
    </span>
  );

  // In the rail: the icon on its own square (filled when active), the name
  // under it; no tooltip needed.
  if (vertical) {
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        aria-label={count > 0 ? `${label} (${count})` : label}
        className={`sb-dock__tab${active ? " is-active" : ""}`}
        onClick={onClick}
      >
        <span className="sb-dock__icon">
          {icon}
          {badge}
        </span>
        <span className="sb-dock__label" aria-hidden>
          {label}
        </span>
      </button>
    );
  }

  return (
    <Tooltip delay={300}>
      <TooltipTrigger asChild>
        <button
          type="button"
          role="tab"
          aria-selected={active}
          aria-label={count > 0 ? `${label} (${count})` : label}
          className={`sb-dock__tab${active ? " is-active" : ""}`}
          onClick={onClick}
        >
          {icon}
          {badge}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

// The dock at the foot of the sidebar: Home · Inbox · Chats, then your
// account. Each tab swaps what the sidebar body shows; Inbox and Chats carry
// red unread badges. Home again while already on Home goes to the space's
// home page. Searching is the search bar at the top (SidebarFind).
// `vertical`: the same tabs as a column with their names, in the desktop
// app's rail (features/desktop/rail), with the account at the foot.
export const SidebarDock = memo(
  ({ vertical = false }: { vertical?: boolean }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const space = useCurrentSpace();
    const { sidebarView, setSidebarView, onCollapsedChange } =
      useEditorLayout();
    // Inside a teamspace, the dock wears its colour.
    const spaceAccent = useSpaceAccent();
    // The rail has its own colour (desktop-rail.scss): no dock wash there.
    const accent = vertical ? null : spaceAccent;

    const { unreadCount } = useNotificationState();
    // Workspace and teamspace invitations count as something waiting in the
    // inbox.
    const { data: invites = [] } = useMyWorkspaceInvites();
    const { invites: teamspaceInvites } = useMyInvites();
    const { data: chatUnread = {} } = useUnreadCounts();
    const chatTotal = useMemo(
      () => Object.values(chatUnread).reduce((a, b) => a + b, 0),
      [chatUnread],
    );

    const goHome = () => {
      if (sidebarView === "pages") {
        const teamspaceId = space.kind === "teamspace" ? space.id : null;
        navigate({ to: spaceHomePath(teamspaceId) });
        if (isMobile) onCollapsedChange(true);
        return;
      }
      setSidebarView("pages");
    };

    return (
      <div
        className={`sb-dock${vertical ? " sb-dock--rail" : ""}${
          accent ? ` ${accent.className}` : ""
        }`}
        style={accent?.style}
        role="tablist"
        aria-label={t("sidebar.navigation", "Sidebar")}
        aria-orientation={vertical ? "vertical" : undefined}
      >
        <DockTab
          icon={<SbHomeIcon {...DOCK_ICON} />}
          label={t("sidebar.home", "Home")}
          active={sidebarView === "pages" || sidebarView === "teams"}
          vertical={vertical}
          onClick={goHome}
        />
        <DockTab
          icon={<SbInboxIcon {...DOCK_ICON} />}
          label={t("sidebar.inbox", "Inbox")}
          active={sidebarView === "inbox"}
          count={unreadCount + invites.length + teamspaceInvites.length}
          vertical={vertical}
          onClick={() => setSidebarView("inbox")}
        />
        <DockTab
          icon={<SbChatsIcon {...DOCK_ICON} />}
          label={t("chat.title", "Chats")}
          active={sidebarView === "chats"}
          count={chatTotal}
          vertical={vertical}
          onClick={() => setSidebarView("chats")}
        />
        <SidebarAccount compact />
      </div>
    );
  },
);
SidebarDock.displayName = "SidebarDock";

// The search bar under the top row: find in pages, and the badge that opens
// the search palette (sidebar-search-input).
export const SidebarFind = memo(() => (
  <div className="sb-find">
    <SidebarSearchInput />
  </div>
));
SidebarFind.displayName = "SidebarFind";
