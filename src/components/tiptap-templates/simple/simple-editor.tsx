"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
//import { useNavigate } from "@tanstack/react-location";

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
import { VersionHistorySidebar } from "src/components/tiptap-ui/version-history/version-history-sidebar";
import { HomePageContent } from "./components";
import { useActivePage } from "./context/active-page-context";
import EditorSkeleton from "./editor-skeleton";
import { PagePeekView } from "./page-peek-view";
import { useEditorLayout } from "./context/editor-layout-context";

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
import "src/components/tiptap-templates/simple/page-create-modal.scss";
import { TocSidebar } from "src/components/tiptap-node/toc-node/toc-sidebar";
import type { View } from "src/types";
import { Editor, useCurrentEditor } from "@tiptap/react";
import { useSearch } from "./context/search-context";
import SearchPalette from "./components/search-palette";
import { useLibrary } from "./context/library-context";
import { LibraryPalette } from "./components/library-palette";
import { usePageView } from "./context/page-view-context";
import { PageCenterView } from "./page-center-view";

const VERSION_SIDEBAR_WIDTH = 260;

function triggerMainEditorSync(mainEditor: Editor | null) {
  if (!mainEditor) return;
  console.log("peekPageClosed dispatched");
  mainEditor.view.dispatch(mainEditor.state.tr.setMeta("peekPageClosed", true));
}

function SimpleEditorMain({ view }: { view: View }) {
  const { versionHistoryOpen, onVersionHistoryOpenChanged /*, collapsed*/ } =
    useEditorLayout();
  const versionWidth = versionHistoryOpen ? VERSION_SIDEBAR_WIDTH : 0;
  const { target, setTarget } = usePageView();
  const { editor } = useCurrentEditor();
  const { open } = useSearch();
  const { open: libraryOpen, onOpenChange } = useLibrary();

  return (
    <>
      {view === "home" && <HomePageContent />}
      {view === "page" && (
        <>
          <div
            className="simple-editor-main"
            style={{
              marginRight: versionWidth,
              // paddingLeft: collapsed ? 80 : 0,
              transition: "margin-right 0.2s ease",
            }}
          >
            <SimpleEditorContent />
            <VersionHistorySidebar
              open={versionHistoryOpen}
              onClose={() => onVersionHistoryOpenChanged(false)}
              userColor="#7c3aed"
            />
            <aside className="simple-editor-sidebar-right" />
          </div>
          <TocSidebar topOffset={80} maxShowCount={20} />
        </>
      )}

      {target && target.view === "Peek" && (
        <PagePeekView
          onClose={() => {
            triggerMainEditorSync(editor);
            setTarget(undefined);
          }}
        />
      )}

      {target && target.view === "Center" && (
        <PageCenterView onClose={() => setTarget(undefined)} />
      )}

      {open && <SearchPalette />}

      {libraryOpen && <LibraryPalette onClose={() => onOpenChange?.(false)} />}
    </>
  );
}

function SimpleEditorInner({ view }: { view: View }) {
  const [mobileView, setMobileView] = useState<MobileView>("main");
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsBreakpoint();
  const { height } = useWindowSize();

  // `activePage` is assumed to be exposed by useActivePage (the same active
  // page that feeds SimpleEditorContentProps). If it actually comes from a
  // route param or a different field, point `activePageId` below at that.
  const { isLoading } = useActivePage();
  const { sidebarWidth, versionHistoryOpen, onVersionHistoryOpenChanged } =
    useEditorLayout();
  const versionWidth = versionHistoryOpen ? VERSION_SIDEBAR_WIDTH : 0;
  useEffect(() => {
    if (!isMobile && mobileView !== "main")
      requestAnimationFrame(() => setMobileView("main"));
  }, [isMobile, mobileView]);

  if (isLoading)
    return (
      <EditorSkeleton toolbarRef={toolbarRef as RefObject<HTMLDivElement>} />
    );

  return (
    <div className="simple-editor-wrapper">
      <NotificationProvider>
        <ToastProvider>
          <SimpleEditorToolbar
            view={view}
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
          <SimpleEditorMain view={view} />
        </ToastProvider>
      </NotificationProvider>
    </div>
  );
}

export function SimpleEditor({ view }: { view: View }) {
  return (
    <TocProvider>
      <SimpleEditorInner view={view} />
    </TocProvider>
  );
}
