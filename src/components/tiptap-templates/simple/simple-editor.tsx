// simple-editor.tsx
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

// --- Providers ---
import { ToastProvider } from "src/components/tiptap-ui/copy-toast";
import { NotificationProvider } from "src/components/tiptap-ui/notification";
import { TocProvider } from "src/components/tiptap-node/toc-node/toc-provider";

// --- Hooks ---
import { useIsBreakpoint } from "src/hooks/use-is-breakpoint";
import { useWindowSize } from "src/hooks/use-window-size";

// --- Local ---
import { SimpleEditorToolbar, type MobileView } from "./simple-editor-toolbar";
import { SimpleEditorContent } from "./simple-editor-content";

// --- Styles ---
import "src/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "src/components/tiptap-node/code-block-node/code-block-node.scss";
import "src/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "src/components/tiptap-node/list-node/list-node.scss";
import "src/components/tiptap-node/image-node/image-node.scss";
import "src/components/tiptap-node/heading-node/heading-node.scss";
import "src/components/tiptap-node/paragraph-node/paragraph-node.scss";
import "src/components/tiptap-templates/simple/simple-editor.scss";
import "src/components/tiptap-templates/simple/toc.scss";
import { SimpleEditorSidebar } from "./simple-editor-sidebar";
import { SimpleEditorProvider } from "./context/simple-editor-provider";
import { VersionHistorySidebar } from "src/components/tiptap-ui/version-history/version-history-sidebar";
import { useInitThreads } from "./hooks/use-init-threads";
import { HomePageContent } from "./components";
import { useVersionContext } from "./context/version-context";
import { useActivePage } from "./use-active-page";
import { EditorProvider } from "./context/editor-provider";

const VERSION_SIDEBAR_WIDTH = 260;
const SIDEBAR_WIDTH = 280;
const SIDEBAR_COLLAPSED_WIDTH = 52;

// Separate component that only cares about activePageId for conditional rendering
function SimpleEditorMain({
  sidebarWidth,
  collapsed,
  versionHistoryOpen,
  onVersionHistoryOpenChanged,
}: {
  sidebarWidth: number;
  collapsed: boolean;
  versionHistoryOpen: boolean;
  onVersionHistoryOpenChanged: (v: boolean) => void;
}) {
  const { activePageId } = useActivePage();
  const versionWidth = versionHistoryOpen ? VERSION_SIDEBAR_WIDTH : 0;

  return (
    <>
      {activePageId === undefined ? (
        <HomePageContent sidebarWidth={sidebarWidth} />
      ) : (
        <div
          className="simple-editor-main"
          style={{
            marginRight: versionWidth,
            transition: "margin-right 0.2s ease",
          }}
        >
          <SimpleEditorContent
            sidebarWidth={sidebarWidth}
            collapsed={collapsed}
          />
          <VersionHistorySidebar
            open={versionHistoryOpen}
            onClose={() => onVersionHistoryOpenChanged(false)}
            userColor="#7c3aed"
          />
          <aside className="simple-editor-sidebar-right" />
        </div>
      )}
    </>
  );
}

function SimpleEditorInner() {
  const [mobileView, setMobileView] = useState<MobileView>("main");
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsBreakpoint();
  const { height } = useWindowSize();

  useEffect(() => {
    if (!isMobile && mobileView !== "main")
      requestAnimationFrame(() => setMobileView("main"));
  }, [isMobile, mobileView]);

  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  const { versionHistoryOpen, onVersionHistoryOpenChanged } =
    useVersionContext()!;
  const versionWidth = versionHistoryOpen ? VERSION_SIDEBAR_WIDTH : 0;
  const onToggle = useCallback(() => setCollapsed((c) => !c), []);

  useInitThreads();

  return (
    <div className="simple-editor-wrapper">
      <NotificationProvider>
        <ToastProvider>
          <SimpleEditorToolbar
            toolbarRef={toolbarRef as RefObject<HTMLDivElement>}
            isMobile={isMobile}
            mobileView={mobileView}
            height={height}
            rectY={0}
            onMobileViewChange={setMobileView}
            sidebarWidth={sidebarWidth}
            versionSidebarWidth={versionWidth}
            onTriggerVersionHistory={() => onVersionHistoryOpenChanged(true)}
          />

          <SimpleEditorSidebar collapsed={collapsed} onToggle={onToggle} />

          {/* Navigation-aware rendering isolated here — doesn't affect EditorProvider */}
          <SimpleEditorMain
            sidebarWidth={sidebarWidth}
            collapsed={collapsed}
            versionHistoryOpen={versionHistoryOpen}
            onVersionHistoryOpenChanged={onVersionHistoryOpenChanged}
          />
        </ToastProvider>
      </NotificationProvider>
    </div>
  );
}

export function SimpleEditor() {
  return (
    <TocProvider>
      <EditorProvider>
        <SimpleEditorProvider>
          <SimpleEditorInner />
        </SimpleEditorProvider>
      </EditorProvider>
    </TocProvider>
  );
}
