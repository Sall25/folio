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
import { Home, LibraryBig, Menu, MessageSquareText } from "lucide-react";
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

function Expand() {
  // const { t } = useTranslation();
  const { collapsed } = useEditorLayoutState();
  const { openPeek, closePeek, onCollapsedChange } = useEditorLayoutActions();

  return (
    <Button
      onClick={() => onCollapsedChange(!collapsed)}
      onMouseEnter={() => collapsed && openPeek()}
      onMouseLeave={closePeek}
      variant="ghost"
      size="large"
      // tooltip={t("sidebar.expand")}
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

  // Favoriting only applies to a user's own private pages. Shared and teamspace
  // pages live in their section by their access model, not the owner's stars.
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
            // marginBottom: 3,
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
// The leading edge is identical across sizes; only the trailing
// controls differ, so this is factored out.
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
// Desktop — everything inline (the current MainToolbarContent)
// ============================================================
export const DesktopToolbarContent = ({ view }: ContentProps) => {
  const { activePage } = useActivePageState();

  return (
    <>
      <TitleGroup view={view} />
      <Spacer />
      <ToolbarPresence />
      <Spacer />

      <ToolbarGroup>
        {view !== "home" && activePage && (
          <>
            <EditedTimeButton page={activePage} />
          </>
        )}

        {view !== "home" && (
          <>
            <ShareButton />
            <Spacer orientation="horizontal" size={8} />
            <FavoriteToggle />
            <Spacer orientation="horizontal" size={8} />
            <DiscussionTrigger />
            <Spacer orientation="horizontal" size={8} />
          </>
        )}

        <MorePopover />
      </ToolbarGroup>
    </>
  );
};

// ============================================================
// Tablet — fold the label-heavy items (edited-time, theme) into
// the More popover; keep undo/redo, bell, more on the bar.
// ============================================================
export const TabletToolbarContent = ({ view }: ContentProps) => {
  const { activePage } = useActivePageState();

  return (
    <>
      <TitleGroup view={view} />
      <Spacer />

      <ToolbarGroup>
        {view !== "home" && activePage && (
          <>
            <UndoRedoButton action="undo" />
            <UndoRedoButton action="redo" />
            <Separator orientation="vertical" />
            <Spacer orientation="horizontal" size={5} />
          </>
        )}

        {/* Edited-time + theme move inside; MorePopover renders them when
            these flags are set. */}
        <MorePopover
          includeTheme={true}
          editedPage={view !== "home" ? activePage : undefined}
        />
      </ToolbarGroup>
    </>
  );
};

// ============================================================
// Mobile — strip to menu · title · more. Everything else lives
// in the More popover.
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
        <MorePopover
          includeTheme
          includeUndoRedo
          includeNotifications
          editedPage={view !== "home" ? activePage : undefined}
          category={
            view !== "home" && activePage
              ? {
                  value: activePage.category,
                  onChange: (category) =>
                    activePageId &&
                    mutateAsync({ id: activePageId, patch: { category } }),
                }
              : undefined
          }
        />
      </ToolbarGroup>
    </>
  );
};

// ============================================================
// Highlighter / link sub-view — a MODE within mobile, unchanged.
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
// Composed toolbar — picks the content by breakpoint.
// ============================================================
export const SimpleEditorToolbar = ({ view }: SimpleEditorToolbarProps) => {
  const [mobileView, setMobileView] = useState<MobileView>("main");
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const { collapsed } = useEditorLayoutState();
  const { isMobile } = useLayoutMode();
  const { expandedWidth } = useEditorLayoutTransient();
  const { mode } = useLayoutMode();
  const sidebarWidth = calculateSidebarWidth(mode, collapsed, expandedWidth);

  useEffect(() => {
    if (!isMobile && mobileView !== "main")
      requestAnimationFrame(() => setMobileView("main"));
  }, [isMobile, mobileView]);

  // Breakpoint selection. useIsMobile/useIsTablet come from the media-query
  // hook; the `isMobile` prop still drives the positioning offset below since
  // that's about the on-screen keyboard, not layout.
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
