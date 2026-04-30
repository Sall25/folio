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
import { useSimpleEditor } from "./context/simple-editor-context";
import { buildBreadcrumb } from "src/lib/build-breadcrumb";
import { PageItemIcon } from "./page-item-icon";
import { useMemo } from "react";

// ============================================================
// Types
// ============================================================

export type MobileView = "main" | "highlighter" | "link";

type MainToolbarProps = {
  isMobile: boolean;
  onTriggerVersionHistory?: () => void;
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
};

// ============================================================
// Main toolbar
// ============================================================

export const MainToolbarContent = ({
  isMobile,
  onTriggerVersionHistory,
}: MainToolbarProps) => {
  const { activePage, pages, setActivePageId } = useSimpleEditor();

  // Derive only what the breadcrumb needs — no stale content reference
  const breadcrumbs = useMemo(() => {
    if (!activePage || !pages) return [];

    return buildBreadcrumb(activePage, pages).map((page) => {
      const isActive = activePage.id === page.id;
      const title = isActive ? activePage.title : page.title;
      const cover = isActive ? activePage.cover : page.cover;
      const locked = isActive
        ? activePage.settings.locked
        : page.settings.locked;

      return {
        label: title || "New Page",
        icon: <PageItemIcon cover={cover} styles={{ fontSize: 14 }} />,
        locked,
        onClick: () => setActivePageId(page.id),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activePage?.id,
    activePage?.title,
    activePage?.cover,
    activePage?.settings.locked,
    pages,
    setActivePageId,
  ]);
  return (
    <>
      <ToolbarGroup>
        <PageBreadcrumb items={breadcrumbs} />
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
