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

/**
 *
 */
export const MainToolbarContent = ({
  isMobile,
  onTriggerVersionHistory,
}: MainToolbarProps) => {
  const { activePage, pages, setActivePageId } = useSimpleEditor();
  const breadcrumbs = buildBreadcrumb(activePage!, pages ?? []).map((page) => {
    if (activePage && activePage.id === page.id) {
      return {
        label: activePage.title || "New Page",
        icon: (
          <PageItemIcon cover={activePage.cover} styles={{ fontSize: 14 }} />
        ),
        locked: activePage.settings.locked,
        onClick: () => setActivePageId(activePage.id),
      };
    }
    return {
      label: page.title || "New Page",
      icon: <PageItemIcon cover={page.cover} styles={{ fontSize: 14 }} />,
      locked: page.settings.locked,
      onClick: () => setActivePageId(page.id),
    };
  });

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
