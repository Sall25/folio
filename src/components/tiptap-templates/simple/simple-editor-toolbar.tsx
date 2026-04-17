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
import type { PageSettings } from "./types";

// ============================================================
// Types
// ============================================================

export type MobileView = "main" | "highlighter" | "link";

type MainToolbarProps = {
  isMobile: boolean;
  settings: PageSettings;
  onFullWidthChanged: (v: boolean) => void;
  onSmallTextChanged: (v: boolean) => void;
  onLockedChanged: (v: boolean) => void;
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
  settings: PageSettings;
  onFullWidthChanged: (v: boolean) => void;
  onSmallTextChanged: (v: boolean) => void;
  onLockedChanged: (v: boolean) => void;
  onMobileViewChange: (view: MobileView) => void;
  sidebarWidth?: number;
};

// ============================================================
// Main toolbar
// ============================================================

export const MainToolbarContent = ({
  isMobile,
  settings,
  onFullWidthChanged,
  onSmallTextChanged,
  onLockedChanged,
}: MainToolbarProps) => (
  <>
    <Spacer />
    {isMobile && <ToolbarSeparator />}
    <ToolbarGroup>
      <UndoRedoButton action="undo" />
      <UndoRedoButton action="redo" />
      <Separator orientation="vertical" />
      <ThemeToggle />
      <NotificationBell />
      <MorePopover
        fullWidth={settings.width === "full"}
        smallText={settings.text === "small"}
        locked={settings.locked}
        onFullWidthChange={onFullWidthChanged}
        onSmallTextChange={onSmallTextChanged}
        onLockedChange={onLockedChanged}
      />
      <AvatarDemo />
    </ToolbarGroup>
  </>
);

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
  settings,
  onFullWidthChanged,
  onSmallTextChanged,
  onLockedChanged,
  onMobileViewChange,
  sidebarWidth,
}: SimpleEditorToolbarProps) => (
  <Toolbar
    ref={toolbarRef}
    style={
      {
        "--sidebar-width": `${sidebarWidth}px`,
        ...(isMobile ? { bottom: `calc(100% - ${height - rectY}px)` } : {}),
      } as React.CSSProperties
    }
  >
    {mobileView === "main" ? (
      <MainToolbarContent
        isMobile={isMobile}
        settings={settings}
        onFullWidthChanged={onFullWidthChanged}
        onSmallTextChanged={onSmallTextChanged}
        onLockedChanged={onLockedChanged}
      />
    ) : (
      <MobileToolbarContent
        type={mobileView === "highlighter" ? "highlighter" : "link"}
        onBack={() => onMobileViewChange("main")}
      />
    )}
  </Toolbar>
);
