import { Button } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "src/components/tiptap-ui-primitive/toolbar";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { UndoRedoButton } from "src/components/tiptap-ui/undo-redo-button";
import { ArrowLeftIcon } from "src/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "src/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "src/components/tiptap-icons/link-icon";
import { MorePopover } from "./more-popover";
import { useActivePageState } from "./context/active-page-context";
import type { View } from "src/types";
import {
  Home,
  LibraryBig,
  Menu,
  MessageSquareText,
  MessagesSquare,
} from "lucide-react";
import { PageCategorySelect } from "./components/page-category-select";
import { Breadcrumbs } from "./breadcrumbs";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import EditedTimeButton from "./components/edited-time-button/edited-time-button";
import { useTranslation } from "react-i18next";
import {
  useEditorLayoutActions,
  useEditorLayoutState,
  useEditorLayoutTransient,
} from "./context/editor-layout-context";
import { useIsMobile, useIsTablet } from "src/hooks/use-breakpoint";
import { SharePanel } from "./components/share-panel";
import { useEffect, useRef, useState } from "react";
import { usePageCapabilities } from "src/hooks/use-page-role";
import { NetworkStatusBadge } from "./components/network-status-badge";
import { ToolbarPresence } from "./components/toolbar-presence";
import { useLayoutMode } from "./hooks/use-layout-mode";
import { calculateSidebarWidth } from "src/lib/utils";
import { LockIcon, StarIcon } from "src/components/tiptap-icons";
import { QuickOpenTrigger } from "./components/quick-open-trigger";
import { useSearch } from "./context/search-context";
import { requestFindFocus } from "src/lib/find-store";
import {
  togglePageChat,
  usePageChatOpen,
} from "./components/chat/page-chat-store";
import { useExistingPageRoom } from "src/hooks/use-page-chat";
import { useUnreadCounts } from "src/hooks/use-chat";

function Expand() {
  const { collapsed } = useEditorLayoutState();
  const { openPeek, closePeek, onCollapsedChange } = useEditorLayoutActions();

  return (
    <Button
      onClick={() => onCollapsedChange(!collapsed)}
      onMouseEnter={() => collapsed && openPeek()}
      onMouseLeave={closePeek}
      variant="ghost"
      size="large"
      style={{ background: "transparent", padding: 0, cursor: "pointer" }}
    >
      <Menu className="tiptap-button-icon" />
    </Button>
  );
}

function FavoriteToggle() {
  const { t } = useTranslation();
  const { activePage, activePageId } = useActivePageState();
  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));

  const { canEditContent } = usePageCapabilities(activePageId);

  if (!activePage || !canEditContent) return null;

  const canFavorite =
    activePage.category === "Private" || activePage.category === "Favorites";
  if (!canFavorite) return null;

  const isFavorite = activePage.category === "Favorites";

  const toggle = () => {
    if (!activePageId) return;
    mutateAsync({
      id: activePageId,
      patch: {
        category: isFavorite ? "Private" : "Favorites",
        generalAccess: "private",
        generalAccessRole: "view",
      },
    });
  };

  return (
    <Button
      variant="ghost"
      size="large"
      tooltip={t(isFavorite ? "page.unfavorite" : "page.favorite")}
      onClick={toggle}
      style={{
        width: "1.25rem",
        height: "1.25rem",
        minWidth: "1.25rem",
        minHeight: "1.25rem",
      }}
    >
      <StarIcon
        className="tiptap-button-icon"
        fill={isFavorite ? "currentColor" : "none"}
        style={{ color: isFavorite ? "var(--tt-brand-color-500)" : undefined }}
      />
    </Button>
  );
}

function DiscussionTrigger() {
  const { discussionOpen } = useEditorLayoutState();
  const { onDiscussionOpenChanged } = useEditorLayoutActions();
  return (
    <Button
      variant="ghost"
      size="large"
      data-active={discussionOpen}
      onClick={() => onDiscussionOpenChanged(!discussionOpen)}
      tooltip="Comments"
      style={{
        width: "1.25rem",
        height: "1.25rem",
        minWidth: "1.25rem",
        minHeight: "1.25rem",
      }}
    >
      <MessageSquareText
        className="tiptap-button-icon"
        style={{ color: "var(--tt-text-primary)" }}
      />
    </Button>
  );
}

// Opens the page's discussion drawer. The unread dot only reads an EXISTING
// room (no room is created just by showing the button).
function PageChatTrigger() {
  const { t } = useTranslation();
  const open = usePageChatOpen();
  const { activePageId } = useActivePageState();
  const room = useExistingPageRoom(activePageId);
  const { data: unread = {} } = useUnreadCounts();
  const hasUnread = !!room && (unread[room.id] ?? 0) > 0;

  if (!activePageId) return null;

  return (
    <Button
      variant="ghost"
      size="large"
      data-active={open}
      onClick={togglePageChat}
      tooltip={t("chat.pageDiscussion", "Discussion")}
      style={{
        position: "relative",
        width: "1.25rem",
        height: "1.25rem",
        minWidth: "1.25rem",
        minHeight: "1.25rem",
      }}
    >
      <MessagesSquare
        className="tiptap-button-icon"
        style={{ color: "var(--tt-text-primary)" }}
      />
      {hasUnread && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -1,
            right: -1,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--sidebar-accent, var(--tt-brand-color-500))",
          }}
        />
      )}
    </Button>
  );
}

function ShareButton() {
  const { activePage } = useActivePageState();
  const { t } = useTranslation();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  if (!activePage) return null;

  return (
    <>
      <Button
        ref={anchorRef}
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        tooltip={t("share.share", "Share")}
        size="large"
        style={{
          border: "1px solid var(--tt-border-color)",
          borderRadius: "var(--tt-radius-sm)",
          minHeight: 22,
          height: 25,
          color: "var(--tt-text-primary)",
        }}
      >
        <LockIcon
          className="tiptap-button-icon"
          style={{
            width: 14,
            height: 14,
            color: "var(--tt-text-primary)",
          }}
        />
        <span className="tiptap-button-text">{t("share.share", "Share")}</span>
      </Button>
      <SharePanel
        page={activePage}
        anchorRef={anchorRef}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

// ============================================================
// Types
// ============================================================

export type MobileView = "main" | "highlighter" | "link";

type ContentProps = {
  view: View;
};

type MobileSubToolbarProps = {
  type: "highlighter" | "link";
  onBack: () => void;
};

type SimpleEditorToolbarProps = {
  rectY: number;
  view: View;
};

// ============================================================
// Shared left group — title / category / breadcrumbs
// ============================================================
function TitleGroup({ view }: { view: View }) {
  const { activePage, activePageId } = useActivePageState();
  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const { t } = useTranslation();
  const { collapsed } = useEditorLayoutState();

  const { canEditContent, isLoading } = usePageCapabilities(activePageId);

  return (
    <ToolbarGroup>
      {collapsed && <Expand />}

      {view === "home" && (
        <Button variant="ghost">
          <Home className="tiptap-button-icon" strokeWidth={2} />
          <span className="tiptap-button-text" style={{ fontWeight: "bold" }}>
            {t("sidebar.home")}
          </span>
        </Button>
      )}
      {view === "library" && (
        <Button variant="ghost">
          <LibraryBig className="tiptap-button-icon" strokeWidth={2} />
          <span className="tiptap-button-text" style={{ fontWeight: "bold" }}>
            {t("sidebar.library")}
          </span>
        </Button>
      )}
      <Breadcrumbs pageId={activePageId} />

      {view !== "home" && activePage && canEditContent && !isLoading && (
        <PageCategorySelect
          value={activePage.category}
          onChange={(category) => {
            if (activePageId)
              mutateAsync({ id: activePageId, patch: { category } });
          }}
        />
      )}
      <NetworkStatusBadge />
    </ToolbarGroup>
  );
}

// ============================================================
// Desktop
// ============================================================
export const DesktopToolbarContent = ({ view }: ContentProps) => {
  const { activePage } = useActivePageState();

  return (
    <>
      <TitleGroup view={view} />
      {view === "page" && (
        <>
          <Spacer />
          <QuickOpenTrigger />
        </>
      )}
      <Spacer />

      <ToolbarGroup>
        <ToolbarPresence />

        {view === "page" && activePage && (
          <>
            <EditedTimeButton page={activePage} />
          </>
        )}

        {view !== "home" && view !== "chat" && (
          <>
            <ShareButton />
            <Spacer orientation="horizontal" size={8} />
            <FavoriteToggle />
            <Spacer orientation="horizontal" size={8} />
            <DiscussionTrigger />
            <Spacer orientation="horizontal" size={8} />
          </>
        )}

        {view === "page" && (
          <>
            <PageChatTrigger />
            <Spacer orientation="horizontal" size={8} />
            <MorePopover />
          </>
        )}
      </ToolbarGroup>
    </>
  );
};

// ============================================================
// Tablet
// ============================================================
export const TabletToolbarContent = ({ view }: ContentProps) => {
  const { activePage } = useActivePageState();

  return (
    <>
      <TitleGroup view={view} />
      <Spacer />

      <ToolbarGroup>
        <QuickOpenTrigger compact />

        {view !== "home" && activePage && (
          <>
            <UndoRedoButton action="undo" />
            <UndoRedoButton action="redo" />
            <Separator orientation="vertical" />
            <Spacer orientation="horizontal" size={5} />
          </>
        )}

        {view === "page" && (
          <>
            <PageChatTrigger />
            <Spacer orientation="horizontal" size={5} />
            <MorePopover includeTheme={true} editedPage={activePage} />
          </>
        )}
      </ToolbarGroup>
    </>
  );
};

// ============================================================
// Mobile
// ============================================================
export const MobileToolbarContent = ({ view }: ContentProps) => {
  const { activePage, activePageId } = useActivePageState();
  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const { collapsed } = useEditorLayoutState();

  return (
    <>
      <ToolbarGroup>
        {collapsed && <Expand />}
        <Breadcrumbs pageId={activePageId} />
      </ToolbarGroup>
      <Spacer />

      <ToolbarGroup>
        <QuickOpenTrigger compact />
        {view === "page" && (
          <>
            <PageChatTrigger />
            <MorePopover
              includeTheme
              includeUndoRedo
              includeNotifications
              editedPage={activePage}
              category={
                activePage
                  ? {
                      value: activePage.category,
                      onChange: (category) =>
                        activePageId &&
                        mutateAsync({ id: activePageId, patch: { category } }),
                    }
                  : undefined
              }
            />
          </>
        )}
      </ToolbarGroup>
    </>
  );
};

// ============================================================
// Highlighter / link sub-view
// ============================================================
export const MobileSubToolbarContent = ({
  type,
  onBack,
}: MobileSubToolbarProps) => (
  <>
    <ToolbarGroup>
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>
    <ToolbarSeparator />
  </>
);

// ============================================================
// Composed toolbar
// ============================================================
export const SimpleEditorToolbar = ({ view }: SimpleEditorToolbarProps) => {
  const [mobileView, setMobileView] = useState<MobileView>("main");
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const { collapsed } = useEditorLayoutState();
  const { onCollapsedChange, setSidebarView } = useEditorLayoutActions();
  const { isMobile } = useLayoutMode();
  const { expandedWidth } = useEditorLayoutTransient();
  const { mode } = useLayoutMode();
  const sidebarWidth = calculateSidebarWidth(mode, collapsed, expandedWidth);
  const { onOpenChange: openQuickOpen } = useSearch();

  useEffect(() => {
    if (!isMobile && mobileView !== "main")
      requestAnimationFrame(() => setMobileView("main"));
  }, [isMobile, mobileView]);

  // Global shortcuts (the toolbar is always mounted):
  //   Ctrl/⌘+P        → quick open
  //   Ctrl/⌘+Shift+F  → find in pages
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (!e.shiftKey && key === "p") {
        e.preventDefault();
        openQuickOpen?.(true);
      } else if (e.shiftKey && key === "f") {
        e.preventDefault();
        if (collapsed) onCollapsedChange(false);
        setSidebarView("search");
        requestAnimationFrame(() => requestFindFocus());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openQuickOpen, collapsed, onCollapsedChange, setSidebarView]);

  const isMobileBp = useIsMobile();
  const isTabletBp = useIsTablet();

  const renderMain = () => {
    if (isMobileBp) return <MobileToolbarContent view={view} />;
    if (isTabletBp) return <TabletToolbarContent view={view} />;
    return <DesktopToolbarContent view={view} />;
  };

  return (
    <Toolbar
      ref={toolbarRef}
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
          padding: collapsed ? "10px 0px !important" : 10,
        } as React.CSSProperties
      }
    >
      {mobileView === "main" ? (
        renderMain()
      ) : (
        <MobileSubToolbarContent
          type={mobileView === "highlighter" ? "highlighter" : "link"}
          onBack={() => setMobileView("main")}
        />
      )}
    </Toolbar>
  );
};
