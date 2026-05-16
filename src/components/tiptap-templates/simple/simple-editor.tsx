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
import { VersionHistorySidebar } from "src/components/tiptap-ui/version-history/version-history-sidebar";
import { HomePageContent } from "./components";
import { useActivePage } from "./use-active-page";
import { EditorProvider } from "./context/editor-provider";
import EditorSkeleton from "./editor-skeleton";
import { PeekPageProvider } from "./context/peek-page-provider";
import { PagePeekView } from "./page-peek-view";
import { usePeekPage } from "./context/peek-page-context";
import { findPage } from "src/lib/find-page";
import { ActivePageProvider } from "./context/active-page-provider";

const VERSION_SIDEBAR_WIDTH = 260;
const SIDEBAR_WIDTH = 270;
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
  const { activePageId, pages } = useActivePage();
  const versionWidth = versionHistoryOpen ? VERSION_SIDEBAR_WIDTH : 0;
  const { setPeekPageId, peekPageId } = usePeekPage();
  const page =
    peekPageId !== null && pages ? findPage(pages, peekPageId) : null;

  return (
    <>
      {activePageId === undefined ? (
        <HomePageContent sidebarWidth={sidebarWidth} />
      ) : (
        <>
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
          {page && (
            <PagePeekView page={page} onClose={() => setPeekPageId(null)} />
          )}
        </>
      )}
    </>
  );
}

function SimpleEditorInner() {
  const [mobileView, setMobileView] = useState<MobileView>("main");
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsBreakpoint();
  const { height } = useWindowSize();
  const { isLoading } = useActivePage();

  useEffect(() => {
    if (!isMobile && mobileView !== "main")
      requestAnimationFrame(() => setMobileView("main"));
  }, [isMobile, mobileView]);

  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const versionWidth = versionHistoryOpen ? VERSION_SIDEBAR_WIDTH : 0;

  const onToggle = useCallback(() => setCollapsed((c) => !c), []);

  if (isLoading)
    return (
      <EditorSkeleton toolbarRef={toolbarRef as RefObject<HTMLDivElement>} />
    );

  return (
    <div className="simple-editor-wrapper">
      <NotificationProvider>
        <ToastProvider>
          <PeekPageProvider>
            <SimpleEditorToolbar
              toolbarRef={toolbarRef as RefObject<HTMLDivElement>}
              isMobile={isMobile}
              mobileView={mobileView}
              height={height}
              rectY={0}
              onMobileViewChange={setMobileView}
              sidebarWidth={sidebarWidth}
              versionSidebarWidth={versionWidth}
              onTriggerVersionHistory={() => setVersionHistoryOpen(true)}
            />

            <SimpleEditorSidebar collapsed={collapsed} onToggle={onToggle} />

            {/* Navigation-aware rendering isolated here — doesn't affect EditorProvider */}
            <SimpleEditorMain
              sidebarWidth={sidebarWidth}
              collapsed={collapsed}
              versionHistoryOpen={versionHistoryOpen}
              onVersionHistoryOpenChanged={(v) => setVersionHistoryOpen(v)}
            />
          </PeekPageProvider>
        </ToastProvider>
      </NotificationProvider>
    </div>
  );
}

export function SimpleEditor() {
  return (
    <EditorProvider>
      <ActivePageProvider>
        <TocProvider>
          <SimpleEditorInner />
        </TocProvider>
      </ActivePageProvider>
    </EditorProvider>
  );
}
