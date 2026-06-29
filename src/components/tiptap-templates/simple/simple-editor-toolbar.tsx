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
import { ThemeToggle } from "src/components/tiptap-templates/simple/theme-toggle";
import { NotificationBell } from "src/components/tiptap-ui/notification";
import { MorePopover } from "./more-popover";
import { useActivePage } from "./context/active-page-context";
import type { View } from "src/types";
import { Home, LibraryBig } from "lucide-react";
import { PageCategorySelect } from "./components/page-category-select";
import { Breadcrumbs } from "./breadcrumbs";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import EditedTimeButton from "./components/edited-time-button/edited-time-button";
import { LanguageSetting } from "src/components/tiptap-ui/language-settings";
import { useTranslation } from "react-i18next";

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
export const MainToolbarContent = ({
  isMobile,
  onTriggerVersionHistory,
  view,
}: MainToolbarProps) => {
  const { activePage, activePageId } = useActivePage();
  const { mutateAsync } = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const { t } = useTranslation();
  return (
    <>
      <ToolbarGroup>
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
        {/* <Separator orientation="vertical" /> */}

        {view !== "home" && activePage && (
          <PageCategorySelect
            value={activePage.category}
            onChange={(category) => {
              if (activePageId)
                mutateAsync({ id: activePageId, patch: { category } });
            }}
          />
        )}
      </ToolbarGroup>
      <Spacer />

      {isMobile && <ToolbarSeparator />}
      <ToolbarGroup>
        {view !== "home" && activePage && (
          <>
            <EditedTimeButton page={activePage} />
            <UndoRedoButton action="undo" />
            <UndoRedoButton action="redo" />
            <Separator orientation="vertical" />
          </>
        )}
        <LanguageSetting />
        <ThemeToggle />
        <NotificationBell />
        <MorePopover onTriggerVersionHistory={onTriggerVersionHistory} />
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
