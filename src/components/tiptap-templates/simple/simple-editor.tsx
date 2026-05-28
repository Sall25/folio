"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

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
import { useActivePage } from "./use-active-page";
import EditorSkeleton from "./editor-skeleton";
import { PeekPageProvider } from "./context/peek-page-provider";
import { PagePeekView } from "./page-peek-view";
import { PageCreateModal } from "./page-create-modal";
import { useCreatePage } from "./context/create-page-context";
import { findPage } from "src/lib/find-page";
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
import type { View } from "./types";
import { ResourcesPage } from "./components/resources/resources-page";
import { usePeekPage } from "./context/peek-page-context";
import { Editor, useCurrentEditor } from "@tiptap/react";

const VERSION_SIDEBAR_WIDTH = 260;

function triggerMainEditorSync(mainEditor: Editor | null) {
  if (!mainEditor) return;
  console.log("peekPageClosed dispatched");
  mainEditor.view.dispatch(mainEditor.state.tr.setMeta("peekPageClosed", true));
}

function SimpleEditorMain({ view }: { view: View }) {
  const { pages } = useActivePage();
  const { versionHistoryOpen, onVersionHistoryOpenChanged, collapsed } =
    useEditorLayout();
  const versionWidth = versionHistoryOpen ? VERSION_SIDEBAR_WIDTH : 0;
  const { setPeekPageId, peekPageId } = usePeekPage();
  const { createPageId, setCreatePageId } = useCreatePage();
  const { editor } = useCurrentEditor();

  const peekPage =
    peekPageId !== null && pages ? findPage(pages, peekPageId) : null;

  return (
    <>
      {view === "home" && <HomePageContent />}
      {view === "resources" && <ResourcesPage />}
      {view === "page" && (
        <>
          <div
            className="simple-editor-main"
            style={{
              marginRight: versionWidth,
              paddingLeft: collapsed ? 80 : 0,
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

      {peekPage && (
        <PagePeekView
          page={peekPage}
          onClose={() => {
            triggerMainEditorSync(editor);
            setPeekPageId(null);
          }}
        />
      )}

      {createPageId !== null && (
        <PageCreateModal onClose={() => setCreatePageId(null)} />
      )}
    </>
  );
}

function SimpleEditorInner({ view }: { view: View }) {
  const [mobileView, setMobileView] = useState<MobileView>("main");
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsBreakpoint();
  const { height } = useWindowSize();
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
          <PeekPageProvider>
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
          </PeekPageProvider>
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
