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
import { useActivePage } from "./use-active-page";
import { SimpleEditorSidebar } from "./simple-editor-sidebar";
import type { Page } from "./types";
import { ActivePageProvider } from "./context/active-page-provider";

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
    updateSettingsAsync,
    pages,
    addPageAsync,
    deletePageAsync,
    setActivePageId,
    query,
    onSearch,
    updateCoverAsync,
    updatePageAsync,
    addCoverAsync,
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

  const onToggle = useCallback(() => setCollapsed((c) => !c), []);

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
            onFullWidthChanged={async (v) =>
              await updateSettingsAsync({ width: v ? "full" : "medium" })
            }
            onSmallTextChanged={async (v) =>
              await updateSettingsAsync({ text: v ? "small" : "normal" })
            }
            onLockedChanged={async (v) =>
              await updateSettingsAsync({ locked: v })
            }
            onMobileViewChange={setMobileView}
            sidebarWidth={sidebarWidth}
          />

          <SimpleEditorSidebar
            pages={pages ?? []}
            activePage={activePage}
            onSelectAsync={async (page) => setActivePageId(page.id)}
            onDeleteAsync={async (id) => await deletePageAsync(id)}
            onAddPageAsync={async (title, parentId) =>
              addPageAsync({ title, parentId })
            }
            onNewPageAsync={async () =>
              addPageAsync({ title: "Untitled", parentId: null })
            }
            // onRename: (id: string, title: string) => void;
            onRenameAsync={async (id: string, title: string) => {
              const page = findPage(pages ?? [], id);
              if (!page) return;
              await updatePageAsync({ ...page, title });
            }}
            query={query}
            onSearchAsync={async () => {
              onSearch(query);
            }}
            collapsed={collapsed}
            onToggle={onToggle}
          />

          <div className="simple-editor-main">
            <SimpleEditorContent
              pages={pages ?? []}
              collapsed={collapsed}
              sidebarWidth={sidebarWidth}
              activePage={activePage}
              updateCoverAsync={updateCoverAsync}
              updatePageAsync={updatePageAsync}
              addCoverAsync={addCoverAsync}
              addPageAsync={addPageAsync}
            />

            <aside className="simple-editor-sidebar-right" />
          </div>
        </ToastProvider>
      </NotificationProvider>
    </div>
  );
}

export function SimpleEditor() {
  const [activePageId, setActivePageId] = useState<string | undefined>(
    undefined,
  );
  return (
    <TocProvider>
      <ActivePageProvider
        activePageId={activePageId}
        setActivePageId={setActivePageId}
      >
        <SimpleEditorInner />
      </ActivePageProvider>
    </TocProvider>
  );
}
