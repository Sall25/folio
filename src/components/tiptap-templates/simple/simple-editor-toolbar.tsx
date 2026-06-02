import { Button } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "src/components/tiptap-ui-primitive/toolbar";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { AvatarDemo } from "src/components/tiptap-ui-primitive/avatar";
import { UndoRedoButton } from "src/components/tiptap-ui/undo-redo-button";
import { ArrowLeftIcon } from "src/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "src/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "src/components/tiptap-icons/link-icon";
import { ThemeToggle } from "src/components/tiptap-templates/simple/theme-toggle";
import { NotificationBell } from "src/components/tiptap-ui/notification";
import { MorePopover } from "./more-popover";
import { PageBreadcrumb } from "src/components/tiptap-ui/page-breadcrumb/page-breadcrumb";
import { buildBreadcrumb } from "src/lib/build-breadcrumb";
import { PageItemIcon } from "./page-item-icon";
import { useMemo } from "react";
import { useActivePage } from "./use-active-page";
import { usePages } from "./use-pages";
import { useMatch } from "@tanstack/react-location";
import type { Page, View } from "./types";
import { Home } from "lucide-react";
import { PageCategorySelect } from "./components/page-category-select";

// ============================================================
// Types
// ============================================================

export type MobileView = "main" | "highlighter" | "link";

type MainToolbarProps = {
  isMobile: boolean;
  onTriggerVersionHistory?: () => void;
  view: View;
};

type MobileToolbarProps = {
  type: "highlighter" | "link";
  onBack: () => void;
};

type SimpleEditorToolbarProps = {
  toolbarRef: React.RefObject<HTMLDivElement>;
  isMobile: boolean;
  mobileView: MobileView;
  height: number;
  rectY: number;
  onMobileViewChange: (view: MobileView) => void;
  sidebarWidth?: number;
  versionSidebarWidth?: number;
  onTriggerVersionHistory?: () => void;
  view: View;
};

// ============================================================
// Main toolbar
// ============================================================

function findPage(pages: Page[], id: number): Page | undefined {
  for (const page of pages) {
    if (page.id === id) return page;
    if (page.children?.length) {
      const found = findPage(page.children, id);
      if (found) return found;
    }
  }
}

export const MainToolbarContent = ({
  isMobile,
  onTriggerVersionHistory,
  view,
}: MainToolbarProps) => {
  const { pages, setActivePageId } = useActivePage();
  const { updatePageAsync } = usePages();

  const { params } = useMatch();
  const activePageId = params.pageId ? Number(params.pageId) : undefined;

  const activePage = useMemo(
    () => (activePageId && pages ? findPage(pages, activePageId) : undefined),
    [activePageId, pages],
  );

  const breadcrumbs = useMemo(() => {
    if (!activePage || !pages) return [];

    return buildBreadcrumb(activePage, pages).map((page) => {
      const isActive = page.id === activePageId;
      const { title, cover, settings } = isActive ? activePage : page;

      return {
        label: title || "New Page",
        icon: (
          <PageItemIcon
            cover={cover}
            styles={{ fontSize: 14, color: page.cover.color }}
          />
        ),
        locked: settings.locked,
        onClick: () => setActivePageId(page.id),
      };
    });
  }, [activePage, activePageId, pages, setActivePageId]);

  return (
    <>
      <ToolbarGroup>
        {view === "home" && (
          <Button variant="ghost">
            <Home className="tiptap-button-icon" strokeWidth={2} />
            <span className="tiptap-button-text" style={{ fontWeight: "bold" }}>
              Home
            </span>
          </Button>
        )}
        <PageBreadcrumb items={breadcrumbs} />
        {view !== "home" && activePage && (
          <PageCategorySelect
            value={activePage.category}
            onChange={(category) =>
              updatePageAsync({ ...activePage, category })
            }
          />
        )}
      </ToolbarGroup>
      <Spacer />

      {isMobile && <ToolbarSeparator />}
      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
        <Separator orientation="vertical" />
        <ThemeToggle />
        <NotificationBell />
        <MorePopover onTriggerVersionHistory={onTriggerVersionHistory} />
        <AvatarDemo />
      </ToolbarGroup>
    </>
  );
};

// ============================================================
// Mobile toolbar
// ============================================================

export const MobileToolbarContent = ({ type, onBack }: MobileToolbarProps) => (
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

export const SimpleEditorToolbar = ({
  toolbarRef,
  isMobile,
  mobileView,
  height,
  rectY,
  onMobileViewChange,
  sidebarWidth,
  versionSidebarWidth,
  onTriggerVersionHistory,
  view,
}: SimpleEditorToolbarProps) => (
  <Toolbar
    ref={toolbarRef}
    style={
      {
        "--sidebar-width": `${sidebarWidth}px`,
        "--version-sidebar-width": `${versionSidebarWidth ?? 0}px`,
        ...(isMobile ? { bottom: `calc(100% - ${height - rectY}px)` } : {}),
      } as React.CSSProperties
    }
  >
    {mobileView === "main" ? (
      <MainToolbarContent
        view={view}
        isMobile={isMobile}
        onTriggerVersionHistory={onTriggerVersionHistory}
      />
    ) : (
      <MobileToolbarContent
        type={mobileView === "highlighter" ? "highlighter" : "link"}
        onBack={() => onMobileViewChange("main")}
      />
    )}
  </Toolbar>
);
