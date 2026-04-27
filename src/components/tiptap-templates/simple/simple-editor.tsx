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
import { ActivePageProvider } from "./context/active-page-provider";
import { SimpleEditorProvider } from "./context/simple-editor-provider";
import { useEditorSetup } from "./hooks/use-editor-setup";
import { VersionHistorySidebar } from "src/components/tiptap-ui/version-history/version-history-sidebar";
import { useSimpleEditor } from "./context/simple-editor-context";

const VERSION_SIDEBAR_WIDTH = 260;
const SIDEBAR_WIDTH = 280;
const SIDEBAR_COLLAPSED_WIDTH = 52;

function SimpleEditorInner() {
  const [mobileView, setMobileView] = useState<MobileView>("main");
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsBreakpoint();
  const { height } = useWindowSize();

  // --- Effects ---
  useEffect(() => {
    if (!isMobile && mobileView !== "main")
      requestAnimationFrame(() => setMobileView("main"));
  }, [isMobile, mobileView]);

  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  const { editor, startVersionPreview, endVersionPreview } = useEditorSetup();
  const { versionHistoryOpen, onVersionHistoryOpenChanged } = useSimpleEditor();
  const versionWidth = versionHistoryOpen ? VERSION_SIDEBAR_WIDTH : 0;

  const onToggle = useCallback(() => setCollapsed((c) => !c), []);

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
            onTriggerVersionHistory={() => {
              onVersionHistoryOpenChanged(true);
            }}
          />

          <SimpleEditorSidebar collapsed={collapsed} onToggle={onToggle} />

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
              editor={editor}
            />

            <VersionHistorySidebar
              open={versionHistoryOpen}
              onClose={() => {
                onVersionHistoryOpenChanged(false);
              }}
              editor={editor}
              startVersionPreview={startVersionPreview}
              endVersionPreview={endVersionPreview}
              userColor="#7c3aed"
            />
            <aside className="simple-editor-sidebar-right" />
          </div>
        </ToastProvider>
      </NotificationProvider>
    </div>
  );
}

export function SimpleEditor() {
  const [activePageId, setActivePageId] = useState<string | number | undefined>(
    undefined,
  );
  return (
    <ActivePageProvider
      activePageId={activePageId as string | undefined}
      setActivePageId={setActivePageId}
    >
      <SimpleEditorProvider>
        <TocProvider>
          <SimpleEditorInner />
        </TocProvider>
      </SimpleEditorProvider>
    </ActivePageProvider>
  );
}
