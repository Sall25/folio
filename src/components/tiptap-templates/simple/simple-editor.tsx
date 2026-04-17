// simple-editor.tsx
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
import { useActivePage } from "./use-active-page";
import { SimpleEditorSidebar } from "./simple-editor-sidebar";
import type { Page } from "./types";

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 52;

// ============================================================
// Inner
// ============================================================

function findPage(pages: Page[], id: string): Page | undefined {
  for (const page of pages) {
    if (page.id === id) return page;
    const found = findPage(page.children, id);
    if (found) return found;
  }
}

function SimpleEditorInner() {
  const {
    activePage,
    isLoading,
    updateSettings,
    pages,
    addPage,
    deletePage,
    setActivePageId,
    query,
    onSearch,
    updateCover,
    updatePage,
  } = useActivePage();
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

  if (isLoading) return <div className="simple-editor-loading">Loading...</div>;
  if (!activePage) return null;

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
            settings={activePage.settings}
            onFullWidthChanged={(v) =>
              updateSettings({ width: v ? "full" : "medium" })
            }
            onSmallTextChanged={(v) =>
              updateSettings({ text: v ? "small" : "normal" })
            }
            onLockedChanged={(v) => updateSettings({ locked: v })}
            onMobileViewChange={setMobileView}
            sidebarWidth={sidebarWidth}
          />

          <SimpleEditorSidebar
            pages={pages ?? []}
            activePage={activePage}
            onSelect={(page) => setActivePageId(page.id)}
            onDelete={(id) => deletePage(id)}
            onAddPage={(title, parentId) => addPage({ title, parentId })}
            onNewPage={() => addPage({ title: "Untitled", parentId: null })}
            // onRename: (id: string, title: string) => void;
            onRename={(id: string, title: string) => {
              const page = findPage(pages ?? [], id);
              if (!page) return;
              updatePage({ ...page, title });
            }}
            query={query}
            onSearch={onSearch}
            collapsed={collapsed}
            onToggle={() => setCollapsed((c) => !c)}
          />

          <div className="simple-editor-main">
            <SimpleEditorContent
              collapsed={collapsed}
              sidebarWidth={sidebarWidth}
              activePage={activePage}
              updateCover={updateCover}
              updatePage={updatePage}
            />

            <aside className="simple-editor-sidebar-right" />
          </div>
        </ToastProvider>
      </NotificationProvider>
    </div>
  );
}

export function SimpleEditor() {
  return (
    <TocProvider>
      <SimpleEditorInner />
    </TocProvider>
  );
}
