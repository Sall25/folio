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
import { useActivePageState } from "../pages/context/active-page-context";
import type { ID, PageCategory, View } from "src/types";
import { Home, LibraryBig, Menu, MessageSquareText } from "lucide-react";
import { PageCategorySelect } from "../pages/page-category-select";
import { Breadcrumbs } from "./breadcrumbs";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import EditedTimeButton from "../pages/edited-time-button/edited-time-button";
import { useTranslation } from "react-i18next";
import {
  useEditorLayoutActions,
  useEditorLayoutState,
  useEditorLayoutTransient,
} from "./context/editor-layout-context";
import { useIsMobile, useIsTablet } from "src/hooks/use-breakpoint";
import { ShareButton } from "../pages/share/share-button";
import { useEffect, useRef, useState } from "react";
import { usePageCapabilities } from "src/hooks/use-page-role";
import { SyncStatus } from "./offline/sync-status";
import { ToolbarPresence } from "../editor/presence/toolbar-presence";
import { useLayoutMode } from "./hooks/use-layout-mode";
import { calculateSidebarWidth } from "src/lib/utils";
import { StarIcon } from "src/components/tiptap-icons";
import { QuickOpenTrigger } from "./search/quick-open-trigger";
import { useSearch } from "./search/search-context";
import { requestFindFocus } from "src/lib/find-store";
import { UserMenu } from "./user-menu/user-menu";

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
// Where the open page lives — the category dropdown's props, shared by the
// desktop bar and the mobile ••• menu.
//   • Favorites / Shared / Private: a page inside a teamspace moves out of it
//     to the top of that section; otherwise only the category changes.
//   • A teamspace: the page moves into it (top level of the teamspace).
//   • A teamspace's own page can't be moved from here.
// ============================================================
function usePageLocation() {
  const { activePage, activePageId } = useActivePageState();
  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));
  if (!activePage || !activePageId) return null;

  const isTeamspaceRoot =
    activePage.parentId == null && activePage.category === "Teamspaces";

  return {
    value: activePage.category,
    teamspaceId: activePage.teamspaceId ?? null,
    locked: isTeamspaceRoot,
    onChange: (category: PageCategory) =>
      mutateAsync({
        id: activePageId,
        patch: activePage.teamspaceId
          ? { category, parentId: null }
          : { category },
      }),
    onMoveToTeamspace: (teamspaceId: ID) =>
      mutateAsync({
        id: activePageId,
        patch: { parentId: teamspaceId, category: "Teamspaces" },
      }),
  };
}

// ============================================================
// Shared left group — title / category / breadcrumbs
// ============================================================
function TitleGroup({ view }: { view: View }) {
  const { activePage, activePageId } = useActivePageState();
  const pageLocation = usePageLocation();
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

      {view !== "home" &&
        activePage &&
        pageLocation &&
        canEditContent &&
        !isLoading && <PageCategorySelect {...pageLocation} />}
      <SyncStatus />
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

        {view === "page" && <MorePopover />}

        {/* Account — always the last item, at the far right. */}
        <Spacer orientation="horizontal" size={8} />
        <UserMenu />
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
          <MorePopover includeTheme={true} editedPage={activePage} />
        )}

        <Spacer orientation="horizontal" size={6} />
        <UserMenu />
      </ToolbarGroup>
    </>
  );
};

// ============================================================
// Mobile
// ============================================================
export const MobileToolbarContent = ({ view }: ContentProps) => {
  const { activePage, activePageId } = useActivePageState();
  const pageLocation = usePageLocation();
  const { collapsed } = useEditorLayoutState();

  return (
    <>
      <ToolbarGroup>
        {collapsed && <Expand />}
        <Breadcrumbs pageId={activePageId} />
      </ToolbarGroup>
      <Spacer />

      <ToolbarGroup>
        <SyncStatus compact />
        <QuickOpenTrigger compact />
        {view === "page" && (
          <>
            <MorePopover
              includeTheme
              includeUndoRedo
              includeNotifications
              editedPage={activePage}
              category={pageLocation ?? undefined}
            />
          </>
        )}

        <Spacer orientation="horizontal" size={4} />
        <UserMenu />
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
